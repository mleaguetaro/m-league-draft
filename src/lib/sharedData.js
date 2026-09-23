import { createClient } from '@supabase/supabase-js';
import { validateTeamSettings } from './teamSettings.js';
import { prepareTeamPhoto } from './teamPhotos.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const sharedEnabled = Boolean(url && key);
export const supabase = sharedEnabled ? createClient(url, key) : null;
const season = '2026-27';

function check(error) {
  if (error) throw new Error(error.message || '共有データの操作に失敗しました。');
}

export async function loadSharedData() {
  const [teams, history] = await Promise.all([
    supabase.from('team_settings').select('id,name,color,image_url,photo_path').eq('season', season),
    supabase.from('point_snapshots').select('*').eq('season', season).order('recorded_at', { ascending: true }),
  ]);
  check(teams.error);
  check(history.error);
  return {
    teamSettings: teams.data.map((row) => ({ id: row.id, name: row.name, color: row.color, imageUrl: row.image_url, photoPath: row.photo_path })),
    manualSnapshots: history.data.map((row) => ({
      id: row.id, date: row.date, recordedAt: row.recorded_at, createdAt: row.created_at,
      order: row.order_number, source: row.source, pointsByPlayer: row.points_by_player, statsByPlayer: row.stats_by_player,
      round: [10, 11, 20, 21].includes(row.order_number) ? Math.floor(row.order_number / 10) : undefined,
      table: [10, 11, 20, 21].includes(row.order_number) ? (row.order_number % 10 ? 'B' : 'A') : undefined,
    })),
  };
}

export async function checkAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  check(error);
  return data === true;
}

export async function signInAdmin(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  check(error);
  if (!await checkAdmin()) {
    await supabase.auth.signOut();
    throw new Error('このアカウントには管理権限がありません。');
  }
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  check(error);
}

export async function changeAdminPassword(currentPassword, newPassword) {
  if (!supabase) throw new Error('共有保存が設定されていません。');
  if (!await checkAdmin()) throw new Error('管理者ログインが必要です。');
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    current_password: currentPassword,
  });
  check(error);
}

export async function saveSharedTeamSettings(teams, defaults) {
  const validated = validateTeamSettings(teams, defaults);
  for (const team of validated) {
    const { data, error } = await supabase.from('team_settings')
      .update({ name: team.name, color: team.color })
      .eq('season', season).eq('id', team.id).select('id');
    check(error);
    if (data.length !== 1) throw new Error('チーム設定を保存できませんでした。');
  }
  return validated;
}

export async function saveSharedSnapshot(snapshot) {
  const row = {
    id: snapshot.id, season, date: snapshot.date, recorded_at: snapshot.recordedAt,
    created_at: snapshot.createdAt, order_number: snapshot.order, source: 'manual',
    points_by_player: snapshot.pointsByPlayer, stats_by_player: snapshot.statsByPlayer || {},
  };
  const { data, error } = await supabase.from('point_snapshots').upsert(row).select('id');
  check(error);
  if (data.length !== 1) throw new Error('履歴を保存できませんでした。');
}

export async function deleteSharedSnapshot(id) {
  const { data, error } = await supabase.from('point_snapshots').delete().eq('id', id).eq('season', season).select('id');
  check(error);
  if (data.length !== 1) throw new Error('履歴を削除できませんでした。');
}

export async function uploadSharedTeamPhoto(teamId, file, previousPath) {
  const dataUrl = await prepareTeamPhoto(file);
  const image = await (await fetch(dataUrl)).blob();
  const path = `${season}/${teamId}/${crypto.randomUUID()}.jpg`;
  const upload = await supabase.storage.from('team-photos').upload(path, image, { contentType: 'image/jpeg', upsert: false });
  check(upload.error);
  const imageUrl = supabase.storage.from('team-photos').getPublicUrl(path).data.publicUrl;
  const update = await supabase.from('team_settings').update({ image_url: imageUrl, photo_path: path })
    .eq('season', season).eq('id', teamId).select('id');
  if (update.error || update.data.length !== 1) {
    await supabase.storage.from('team-photos').remove([path]);
    check(update.error);
    throw new Error('チーム写真を保存できませんでした。');
  }
  if (previousPath) await supabase.storage.from('team-photos').remove([previousPath]);
  return { imageUrl, photoPath: path };
}

export async function removeSharedTeamPhoto(teamId, previousPath) {
  const update = await supabase.from('team_settings').update({ image_url: null, photo_path: null })
    .eq('season', season).eq('id', teamId).select('id');
  check(update.error);
  if (update.data.length !== 1) throw new Error('チーム写真を削除できませんでした。');
  if (previousPath) await supabase.storage.from('team-photos').remove([previousPath]);
}
