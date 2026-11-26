import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractProgramCodes,
  isCandidateInAssessorScope,
  normalizeCompanyName,
  type ResolvedScopeContext
} from './tenant';

test('normalizeCompanyName strips legal suffixes and punctuation', () => {
  assert.equal(normalizeCompanyName('PT Telkom Indonesia (Persero) Tbk'), 'telkomindonesia');
  assert.equal(normalizeCompanyName('CV. Karya Mandiri'), 'karyamandiri');
  assert.equal(normalizeCompanyName(null), '');
});

test('extractProgramCodes merges assessmentId, assessmentIds JSON/CSV, and examAttempts', () => {
  assert.deepEqual(extractProgramCodes(null), []);
  assert.deepEqual(
    extractProgramCodes({
      assessmentId: 'prog-a',
      assessmentIds: JSON.stringify(['PROG-B', 'prog-a', ' prog-c ']),
      examAttempts: [{ programCode: 'PROG-D' }, { programCode: 'PROG-B' }]
    }),
    ['PROG-A', 'PROG-B', 'PROG-C', 'PROG-D']
  );
  assert.deepEqual(
    extractProgramCodes({ assessmentIds: 'cat-1, cat-2' }),
    ['CAT-1', 'CAT-2']
  );
});

const makeAssessorCtx = (overrides: Partial<ResolvedScopeContext> = {}): ResolvedScopeContext => ({
  tenantId: 'tenant-1',
  companyId: 'PT-01',
  companyName: 'PT Telkom Indonesia Tbk',
  normalizedCompany: normalizeCompanyName('PT Telkom Indonesia Tbk'),
  assignedProgramCodes: [],
  ...overrides
});

test('isCandidateInAssessorScope allows PT-wide assessor within matching company only', () => {
  const ctx = makeAssessorCtx({ assignedProgramCodes: [] });

  assert.equal(
    isCandidateInAssessorScope(ctx, {
      tenantId: 'tenant-1',
      companyName: 'Telkom Indonesia',
      assessmentId: 'ANY-PROG'
    }),
    true
  );

  assert.equal(
    isCandidateInAssessorScope(ctx, {
      tenantId: 'tenant-2',
      companyName: 'PT Bank Rakyat Indonesia',
      assessmentId: 'ANY-PROG'
    }),
    false
  );

  assert.equal(isCandidateInAssessorScope(ctx, null), false);
});

test('isCandidateInAssessorScope matches same tenantId even when assessor agency companyName differs', () => {
  const ctx = makeAssessorCtx({
    tenantId: 'tenant-telkom',
    companyName: 'Solusi Asesmen Indonesia',
    normalizedCompany: normalizeCompanyName('Solusi Asesmen Indonesia'),
    assignedProgramCodes: []
  });

  assert.equal(
    isCandidateInAssessorScope(ctx, {
      tenantId: 'tenant-telkom',
      companyName: 'PT Telkom Indonesia Tbk',
      assessmentId: 'SE-402'
    }),
    true
  );

  assert.equal(
    isCandidateInAssessorScope(ctx, {
      tenantId: 'tenant-mandiri',
      companyName: 'PT Bank Mandiri (Persero) Tbk',
      assessmentId: 'BMRI-DATA-02'
    }),
    false
  );
});

test('isCandidateInAssessorScope enforces assignedProgramCodes across single, multi, and exam programs', () => {
  const ctx = makeAssessorCtx({ assignedProgramCodes: ['PROG-A', 'PROG-B'] });

  assert.equal(
    isCandidateInAssessorScope(ctx, {
      companyName: 'PT Telkom Indonesia Tbk',
      assessmentId: 'prog-a'
    }),
    true
  );

  assert.equal(
    isCandidateInAssessorScope(ctx, {
      companyName: 'PT Telkom Indonesia Tbk',
      assessmentIds: JSON.stringify(['PROG-X', 'PROG-B'])
    }),
    true
  );

  assert.equal(
    isCandidateInAssessorScope(ctx, {
      companyName: 'PT Telkom Indonesia Tbk',
      examAttempts: [{ programCode: 'PROG-B' }]
    }),
    true
  );

  assert.equal(
    isCandidateInAssessorScope(ctx, {
      companyName: 'PT Telkom Indonesia Tbk',
      assessmentId: 'PROG-Z'
    }),
    false
  );

  assert.equal(
    isCandidateInAssessorScope(ctx, {
      companyName: 'PT Telkom Indonesia Tbk'
    }),
    false
  );
});
