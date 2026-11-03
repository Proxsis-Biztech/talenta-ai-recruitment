import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreAnswers } from '../controllers/ExamController';

const questions = [
  { orderNo: 1, type: 'single', competency: 'Architecture', correctAnswer: JSON.stringify('A') },
  { orderNo: 2, type: 'multi', competency: 'Architecture', correctAnswer: JSON.stringify(['A', 'C']) },
  { orderNo: 3, type: 'short', competency: 'Troubleshooting', correctAnswer: JSON.stringify('422 Unprocessable Entity') },
  {
    orderNo: 4,
    type: 'matching',
    competency: 'Troubleshooting',
    correctAnswer: JSON.stringify([{ left: 'Timeout', correctRight: 'Retry with backoff' }])
  },
  { orderNo: 5, type: 'essay', competency: 'Communication', correctAnswer: null }
];

test('scores objective questions and flags essays for manual review', () => {
  const result = scoreAnswers(questions, {
    1: 'A',
    2: ['C', 'A'],
    3: '422',
    4: { Timeout: 'Retry with backoff' },
    5: 'Analisis esai'
  });
  assert.equal(result.score, 100);
  assert.equal(result.autoGraded, 4);
  assert.equal(result.manualReview, 1);
  assert.equal(result.competencyScores.length, 2);
});

test('does not award points for wrong or incomplete answers', () => {
  const result = scoreAnswers(questions, {
    1: 'B',
    2: ['A'],
    3: '500',
    4: { Timeout: 'Drop request' }
  });
  assert.equal(result.score, 0);
  assert.equal(result.manualReview, 1);
});
