import { describe, expect, it } from 'vitest'
import {
  setLang,
  t,
  modeLabel,
  earlyLateLabel,
  gradeLabel,
  themeLabel,
  soundLabel,
  achievementLabel,
  unlockSummary,
} from '../src/data/Locale'

describe('Locale VI', () => {
  it('defaults Vietnamese strings', () => {
    setLang('vi')
    expect(t('play')).toBe('CHƠI')
    expect(t('hold')).toBe('GIỮ')
    expect(t('back')).toBe('QUAY LẠI')
    expect(t('oneMore')).toBe('THÊM LẦN')
    expect(modeLabel('classic')).toBe('CỔ ĐIỂN')
    expect(earlyLateLabel('EARLY')).toBe('SỚM')
    expect(gradeLabel('ULTRA')).toBe('SIÊU')
    expect(gradeLabel('PERFECT')).toBe('HOÀN HẢO')
    expect(themeLabel('ember')).toBe('TÀN LỬA')
    expect(soundLabel('crystal')).toBe('PHA LÊ')
    expect(achievementLabel('first_run')).toBe('LƯỢT ĐẦU')
    expect(unlockSummary(['first_run'])).toContain('LƯỢT ĐẦU')
  })

  it('switches to English', () => {
    setLang('en')
    expect(t('play')).toBe('PLAY')
    expect(t('hold')).toBe('HOLD')
    expect(t('back')).toBe('BACK')
    expect(themeLabel('ember')).toBe('EMBER')
    setLang('vi')
  })
})
