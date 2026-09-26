import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getPinyinInitials,
  matchesProductText,
} from '../src/utils/pinyin.ts'

test('getPinyinInitials converts Chinese labels and removes punctuation', () => {
  assert.equal(getPinyinInitials('菠菜(斤)'), 'BCJ')
  assert.equal(getPinyinInitials('生冻虾'), 'SDX')
  assert.equal(getPinyinInitials(''), '')
})

test('matchesProductText supports Chinese, specs and pinyin initials', () => {
  const label = '菠菜(斤)'

  assert.equal(matchesProductText('菠菜', label), true)
  assert.equal(matchesProductText('斤', label), true)
  assert.equal(matchesProductText('bc', label), true)
  assert.equal(matchesProductText('bcj', label), true)
  assert.equal(matchesProductText('BC', label), true)
  assert.equal(matchesProductText('南瓜', label), false)
})

test('matchesProductText treats an empty keyword as a match', () => {
  assert.equal(matchesProductText('', '菠菜(斤)'), true)
  assert.equal(matchesProductText('   ', '菠菜(斤)'), true)
})
