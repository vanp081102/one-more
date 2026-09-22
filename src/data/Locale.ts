export type Lang = 'vi' | 'en'

type Dict = Record<string, string>

const vi: Dict = {
  tagline: 'Giữ. Thả. Thêm một lần.',
  play: 'CHƠI',
  zen: 'THIỀN',
  perfect: 'HOÀN HẢO',
  speed: 'TỐC ĐỘ',
  mirror: 'GƯƠNG',
  drift: 'TRÔI',
  blink: 'NHỚ',
  chaos: 'HỖN LOẠN',
  endless: 'VÔ TẬN',
  daily: 'HÀNG NGÀY',
  classic: 'CỔ ĐIỂN',
  scores: 'ĐIỂM',
  settings: 'CÀI ĐẶT',
  theme: 'GIAO DIỆN',
  sound: 'ÂM THANH',
  best: 'CAO NHẤT',
  hold: 'GIỮ',
  release: 'THẢ',
  back: 'QUAY LẠI',
  score: 'ĐIỂM',
  accuracy: 'ĐỘ CHÍNH XÁC',
  maxCombo: 'COMBO TỐI ĐA',
  oneMore: 'THÊM LẦN',
  replaySeed: 'CHƠI LẠI SEED',
  share: 'CHIA SẺ',
  home: 'TRANG CHỦ',
  volume: 'ÂM LƯỢNG',
  reducedMotion: 'GIẢM CHUYỂN ĐỘNG',
  vibration: 'RUNG',
  timingGhost: 'BÓNG TIMING',
  colorblind: 'MÙ MÀU',
  noAudioCues: 'KHÔNG ÂM THANH',
  language: 'NGÔN NGỮ',
  accentColor: 'MÀU NHẤN',
  resetAccent: 'ĐẶT LẠI',
  localBests: 'Kỷ lục máy này',
  noRunsYet: 'Chưa có lượt chơi',
  tabLocal: 'MÁY NÀY',
  tabGlobal: 'TOÀN CẦU',
  tabProgress: 'LEVEL',
  loginGoogle: 'GOOGLE',
  loginGuest: 'KHÁCH',
  logout: 'ĐĂNG XUẤT',
  notLoggedIn: 'Chưa đăng nhập',
  cloudOff: 'Cloud chưa cấu hình',
  cloudSetupHint: 'Thêm Firebase trong .env để bật xếp hạng online',
  globalBests: 'Bảng xếp hạng toàn cầu',
  loginForGlobal: 'Đăng nhập để đồng bộ & xếp hạng',
  noGlobalYet: 'Chưa có điểm online',
  clearedLevels: 'Level đã chinh phục',
  totalScore: 'TỔNG ĐIỂM',
  rankByTotal: 'Xếp theo tổng điểm',
  you: 'Bạn',
  syncing: 'Đang đồng bộ…',
  synced: 'Đã lưu lên cloud',
  loginFailed: 'Đăng nhập thất bại',
  streak: 'CHUỖI',
  newBest: 'KỶ LỤC MỚI',
  toBest: 'CÒN ĐẾN KỶ LỤC',
  unlocked: 'MỞ KHÓA',
  complete: 'HOÀN THÀNH',
  miss: 'TRƯỢT',
  early: 'SỚM',
  late: 'MUỘN',
  fake: 'GIẢ',
  seed: 'SEED',
  seedCopied: 'ĐÃ CHÉP SEED',
  copied: 'ĐÃ CHÉP',
  mem: 'NHỚ',
  nice: 'HAY',
  great: 'TUYỆT',
  insane: 'ĐỈNH',
  perfectRun: 'CHUỖI HOÀN HẢO',
  difficulty: 'ĐỘ KHÓ',
  modeInfo: 'Mô tả chế độ',
  pickModeHint: 'Chọn level 1–500',
  selectLevel: 'CHỌN LEVEL',
  level: 'LEVEL',
  locked: 'KHÓA',
  clearAt: 'MỤC TIÊU',
  levelCleared: 'HOÀN THÀNH LEVEL',
  nextLevel: 'MỞ LEVEL',
  goNextLevel: 'SANG LEVEL',
  clearAsk: 'Đủ điểm! Sang Level',
  retryLevel: 'CHƠI LẠI LEVEL NÀY',
  levelUp: 'LÊN LEVEL',
  blurb_classic: 'Một lần trượt là hết. Cổ điển.',
  blurb_zen: 'Không game over. 30 nhịp — săn độ chính xác.',
  blurb_perfect: 'Chỉ PERFECT / ULTRA mới sống.',
  blurb_speed: 'Tăng tốc mạnh ngay từ đầu.',
  blurb_mirror: 'Đảo chiều liên tục. Đi cả hai hướng.',
  blurb_drift: 'Vùng ghi điểm luôn chuyển động.',
  blurb_blink: 'Nhìn nhanh rồi biến mất — nhớ vị trí.',
  blurb_chaos: 'Mọi kiểu pattern trộn lẫn.',
  blurb_endless: 'Không trần điểm. Đi càng xa càng tốt.',
  blurb_daily: 'Cùng seed mỗi ngày. So tài công bằng.',
  // grades
  ultra: 'SIÊU',
  good: 'ỔN',
  // phases
  discovery: 'KHÁM PHÁ',
  precision: 'CHÍNH XÁC',
  moving: 'DI CHUYỂN',
  reversal: 'ĐẢO CHIỀU',
  multi: 'LIÊN HOÀN',
  memory: 'TRÍ NHỚ',
  master: 'BẬC THẦY',
  // themes
  theme_default: 'MẶC ĐỊNH',
  theme_ember: 'TÀN LỬA',
  theme_ice: 'BĂNG',
  theme_void: 'HƯ VÔ',
  theme_signal: 'TÍN HIỆU',
  // sounds
  sound_default: 'MẶC ĐỊNH',
  sound_crystal: 'PHA LÊ',
  sound_soft: 'ÊM',
  sound_punch: 'MẠNH',
  // achievements
  ach_first_run: 'LƯỢT ĐẦU',
  ach_first_perfect: 'HOÀN HẢO ĐẦU',
  ach_combo_25: 'COMBO 25',
  ach_combo_100: 'MỘT TRĂM',
  ach_score_5000: '5K ĐIỂM',
  ach_daily_clear: 'HÀNG NGÀY',
  ach_zen_complete: 'THIỀN XONG',
}

const en: Dict = {
  tagline: 'Hold. Release. One more.',
  play: 'PLAY',
  zen: 'ZEN',
  perfect: 'PERFECT',
  speed: 'SPEED',
  mirror: 'MIRROR',
  drift: 'DRIFT',
  blink: 'BLINK',
  chaos: 'CHAOS',
  endless: 'ENDLESS',
  daily: 'DAILY',
  classic: 'CLASSIC',
  scores: 'SCORES',
  settings: 'SETTINGS',
  theme: 'THEME',
  sound: 'SOUND',
  best: 'BEST',
  hold: 'HOLD',
  release: 'RELEASE',
  back: 'BACK',
  score: 'SCORE',
  accuracy: 'ACCURACY',
  maxCombo: 'MAX COMBO',
  oneMore: 'ONE MORE',
  replaySeed: 'REPLAY SEED',
  share: 'SHARE',
  home: 'HOME',
  volume: 'VOLUME',
  reducedMotion: 'REDUCED MOTION',
  vibration: 'VIBRATION',
  timingGhost: 'TIMING GHOST',
  colorblind: 'COLORBLIND',
  noAudioCues: 'NO AUDIO CUES',
  language: 'LANGUAGE',
  accentColor: 'ACCENT',
  resetAccent: 'RESET',
  localBests: 'Local bests',
  noRunsYet: 'No runs yet',
  tabLocal: 'LOCAL',
  tabGlobal: 'GLOBAL',
  tabProgress: 'LEVELS',
  loginGoogle: 'GOOGLE',
  loginGuest: 'GUEST',
  logout: 'LOG OUT',
  notLoggedIn: 'Not signed in',
  cloudOff: 'Cloud not configured',
  cloudSetupHint: 'Add Firebase keys in .env to enable online ranks',
  globalBests: 'Global leaderboard',
  loginForGlobal: 'Sign in to sync & rank',
  noGlobalYet: 'No online scores yet',
  clearedLevels: 'Levels conquered',
  totalScore: 'TOTAL SCORE',
  rankByTotal: 'Ranked by total score',
  you: 'You',
  syncing: 'Syncing…',
  synced: 'Saved to cloud',
  loginFailed: 'Sign-in failed',
  streak: 'STREAK',
  newBest: 'NEW BEST',
  toBest: 'TO BEST',
  unlocked: 'UNLOCKED',
  complete: 'COMPLETE',
  miss: 'MISS',
  early: 'EARLY',
  late: 'LATE',
  fake: 'FAKE',
  seed: 'SEED',
  seedCopied: 'SEED COPIED',
  copied: 'COPIED',
  mem: 'MEM',
  nice: 'NICE',
  great: 'GREAT',
  insane: 'INSANE',
  perfectRun: 'PERFECT RUN',
  difficulty: 'DIFFICULTY',
  modeInfo: 'Mode info',
  pickModeHint: 'Pick level 1–500',
  selectLevel: 'SELECT LEVEL',
  level: 'LEVEL',
  locked: 'LOCKED',
  clearAt: 'CLEAR AT',
  levelCleared: 'LEVEL CLEARED',
  nextLevel: 'UNLOCKED LEVEL',
  goNextLevel: 'GO TO LEVEL',
  clearAsk: 'Score met! Continue to Level',
  retryLevel: 'RETRY THIS LEVEL',
  levelUp: 'LEVEL UP',
  blurb_classic: 'One miss ends the run. Classic rules.',
  blurb_zen: 'No game over. 30 hits — chase accuracy.',
  blurb_perfect: 'Only PERFECT / ULTRA survive.',
  blurb_speed: 'Hard speed ramp from the start.',
  blurb_mirror: 'Direction flips constantly. Read both ways.',
  blurb_drift: 'The scoring zone never sits still.',
  blurb_blink: 'See it — then it vanishes. Memorize.',
  blurb_chaos: 'Every pattern type in a seeded mix.',
  blurb_endless: 'No score ceiling. Go as far as you can.',
  blurb_daily: 'Same seed each day. Fair fight.',
  ultra: 'ULTRA',
  good: 'GOOD',
  discovery: 'DISCOVERY',
  precision: 'PRECISION',
  moving: 'MOVING',
  reversal: 'REVERSAL',
  multi: 'MULTI',
  memory: 'MEMORY',
  master: 'MASTER',
  theme_default: 'DEFAULT',
  theme_ember: 'EMBER',
  theme_ice: 'ICE',
  theme_void: 'VOID',
  theme_signal: 'SIGNAL',
  sound_default: 'DEFAULT',
  sound_crystal: 'CRYSTAL',
  sound_soft: 'SOFT',
  sound_punch: 'PUNCH',
  ach_first_run: 'FIRST RUN',
  ach_first_perfect: 'FIRST PERFECT',
  ach_combo_25: 'COMBO 25',
  ach_combo_100: 'ONE HUNDRED',
  ach_score_5000: '5K SCORE',
  ach_daily_clear: 'DAILY',
  ach_zen_complete: 'ZEN CLEAR',
}

const tables: Record<Lang, Dict> = { vi, en }

let current: Lang = 'vi'

export function getLang(): Lang {
  return current
}

export function setLang(lang: Lang): void {
  current = lang === 'en' ? 'en' : 'vi'
}

export function t(key: string): string {
  return tables[current][key] ?? tables.en[key] ?? key
}

export function modeLabel(modeId: string): string {
  return t(modeId) || modeId.toUpperCase()
}

export function modeBlurb(modeId: string): string {
  return t(`blurb_${modeId}`) || modeId
}

export function themeLabel(themeId: string): string {
  return t(`theme_${themeId}`) || themeId.toUpperCase()
}

export function soundLabel(soundId: string): string {
  return t(`sound_${soundId}`) || soundId.toUpperCase()
}

export function achievementLabel(id: string): string {
  return t(`ach_${id}`) || id
}

export function phaseLabel(phaseName: string, memoryActive: boolean): string {
  if (!phaseName || phaseName === 'DISCOVERY') return ''
  const keyMap: Record<string, string> = {
    DISCOVERY: 'discovery',
    SPEED: 'speed',
    PRECISION: 'precision',
    MOVING: 'moving',
    FAKE: 'fake',
    REVERSAL: 'reversal',
    MULTI: 'multi',
    MEMORY: 'memory',
    CHAOS: 'chaos',
    MASTER: 'master',
  }
  const key = keyMap[phaseName]
  const base = key ? t(key) : phaseName
  return memoryActive ? `${base} · ${t('mem')}` : base
}

export function milestoneLabel(label: string): string {
  const map: Record<string, string> = {
    NICE: t('nice'),
    GREAT: t('great'),
    INSANE: t('insane'),
    'PERFECT RUN': t('perfectRun'),
    PERFECT: t('perfect'),
    MASTER: t('master'),
    CHAOS: t('chaos'),
  }
  return map[label] ?? label
}

export function gradeLabel(grade: string): string {
  switch (grade) {
    case 'ULTRA':
      return t('ultra')
    case 'PERFECT':
      return t('perfect')
    case 'GREAT':
      return t('great')
    case 'GOOD':
      return t('good')
    case 'MISS':
      return t('miss')
    default:
      return grade
  }
}

export function earlyLateLabel(code: string): string {
  switch (code) {
    case 'EARLY':
      return t('early')
    case 'LATE':
      return t('late')
    case 'FAKE':
      return t('fake')
    default:
      return t('miss')
  }
}

export function unlockSummary(ids: string[]): string {
  if (ids.length === 0) return ''
  const names = ids.map((id) => achievementLabel(id)).join(' · ')
  return `${t('unlocked')} · ${names}`
}
