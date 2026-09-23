// Phase 1 demo values. These are fictional and must never be presented as official stats.
export const season = {
  id: '2026-27',
  label: '2026-27 REGULAR SEASON',
  dataStatus: 'demo',
  teams: [
    {
      id: 'a',
      name: 'KUSUNOKI',
      color: '#c62828',
      imageUrl: null,
      memberIds: ['date', 'watanabe', 'hori', 'shimoishi'],
    },
    {
      id: 'b',
      name: 'KISHIMOTO',
      color: '#1565c0',
      imageUrl: null,
      memberIds: ['sasaki', 'nakabayashi', 'kurosawa', 'katsumata'],
    },
  ],
  players: {
    date: { id: 'date', name: '伊達朱里紗', imageUrl: 'https://m-league.jp/wp/wp-content/uploads/2018/10/profile_date_arisa-3.png' },
    watanabe: { id: 'watanabe', name: '渡辺太', imageUrl: 'https://m-league.jp/wp/wp-content/uploads/2016/07/profile_watanabe_futoshi-2.png' },
    hori: { id: 'hori', name: '堀慎吾', imageUrl: 'https://m-league.jp/wp/wp-content/uploads/2018/09/profile_hori_shingo-3.png' },
    shimoishi: { id: 'shimoishi', name: '下石戟', imageUrl: 'https://m-league.jp/wp/wp-content/uploads/2023/07/profile_shimoishi_geki-1.png' },
    sasaki: { id: 'sasaki', name: '佐々木寿人', imageUrl: 'https://m-league.jp/wp/wp-content/uploads/2018/10/profile_sasaki_hisato-3.png' },
    nakabayashi: { id: 'nakabayashi', name: '仲林圭', imageUrl: 'https://m-league.jp/wp/wp-content/uploads/2017/08/profile_nakabayashi_kei-3.png' },
    kurosawa: { id: 'kurosawa', name: '黒沢咲', imageUrl: 'https://m-league.jp/wp/wp-content/uploads/2018/10/profile_kurosawa_saki-3.png' },
    katsumata: { id: 'katsumata', name: '勝又健志', imageUrl: 'https://m-league.jp/wp/wp-content/uploads/2018/10/profile_katsumata_kenji-3.png' },
  },
  snapshots: [
    {
      id: 'demo-2026-09-20',
      recordedAt: '2026-09-20T22:30:00+09:00',
      source: 'demo',
      pointsByPlayer: {
        date: 161.8,
        watanabe: 43.7,
        hori: -19.6,
        shimoishi: 8.1,
        sasaki: 109.4,
        nakabayashi: -14.2,
        kurosawa: 70.9,
        katsumata: -10.5,
      },
    },
    {
      id: 'demo-2026-09-22',
      recordedAt: '2026-09-22T22:30:00+09:00',
      source: 'demo',
      pointsByPlayer: {
        date: 182.4,
        watanabe: 56.8,
        hori: -38.2,
        shimoishi: 13.1,
        sasaki: 116.2,
        nakabayashi: -21.6,
        kurosawa: 64.3,
        katsumata: -12.8,
      },
    },
  ],
};
