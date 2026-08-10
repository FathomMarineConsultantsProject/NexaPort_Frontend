import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'fs/promises';
import { buildStructuredEvidence, suggestFieldsFromEvidence } from '../src/utils/templateEvidence.js';

const source = async (file) => readFile(new URL(file, import.meta.url), "utf8");

describe('Extraction Quality Tests - Frontend', () => {
    describe('XLSX EVIDENCE TESTS', () => {
        test('Separate metadata cells produce separate fields', () => {
            // Ship Name matches COMMON_LABELS (ship), Port matches (port)
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: 'Ship Name *' },
                    { text: 'Port of Registry *' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.ok(fields.some(f => f.label === 'Ship Name'), 'Ship Name should be a field');
            assert.ok(fields.some(f => f.label === 'Port of Registry'), 'Port of Registry should be a field');
            assert.equal(fields.length, 2, 'Should produce exactly 2 separate fields');
        });

        test('Date and Revision are separate fields', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: 'Date *' },
                    { text: 'Certificate Number *' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.ok(fields.some(f => f.label === 'Date'), 'Date should be a field');
            assert.ok(fields.some(f => f.label === 'Certificate Number'), 'Certificate Number should be a field');
        });

        test('Excel serial date is NOT a field label', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [{ text: '46196' }]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.ok(!fields.some(f => f.label.includes('46196')), 'Raw serial number should not become a field label');
        });

        test('Merged heading text becomes a section, not coordinate labels', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: 'Risk Assessment', bold: true, fontSize: 16 },
                    { text: 'Hull condition Good Fair Poor' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            // Risk Assessment should be detected as a section heading, not a field
            assert.ok(!fields.some(f => f.label === 'Risk Assessment'), 'Bold heading should not be a field');
            // The field that follows should use Risk Assessment as its section
            assert.ok(fields.length >= 1, 'Should have at least one field');
            assert.equal(fields[0].section, 'Risk Assessment', 'Following field should be in the heading section');
        });

        test('No field has label starting with Merged heading', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: 'Merged heading H65:J65: Risk Assessment' },
                    { text: 'Hull condition Good Fair Poor' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.ok(!fields.some(f => f.label.startsWith('Merged heading')), 'No field should start with Merged heading');
        });

        test('Yes/No columns become one yes_no field', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [{ text: 'Is there any risk of fire? Yes No' }]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.equal(fields.length, 1, 'Should produce exactly one field');
            assert.equal(fields[0].type, 'yes_no', 'Should be yes_no type');
        });

        test('Status infers select when options exist', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [{ text: 'Hull condition Good Fair Poor' }]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.equal(fields.length, 1, 'Should produce one field');
            assert.equal(fields[0].type, 'select', 'Should infer select type');
            assert.deepEqual(fields[0].options, ['Good', 'Fair', 'Poor']);
        });

        test('Remarks infers textarea', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [{ text: 'Remarks *' }]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.equal(fields.length, 1);
            assert.equal(fields[0].type, 'textarea');
        });

        test('Sheet order is preserved', () => {
            const evidence = [
                { name: 'Page 1', lines: [{ text: 'Ship Name *' }] },
                { name: 'Page 2', lines: [{ text: 'Port of call *' }] }
            ];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            const field1 = fields.find(f => f.label === 'Ship Name');
            const field2 = fields.find(f => f.label === 'Port of call');

            assert.ok(field1, 'Ship Name should be found');
            assert.ok(field2, 'Port of call should be found');
            assert.ok(field1.sortOrder < field2.sortOrder, 'Page 1 field should have lower sortOrder');
        });

        test('Row and column order are preserved', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: 'Vessel Name *' },
                    { text: 'Hull condition Good Fair Poor' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.ok(fields.length >= 2, 'Should have at least 2 fields');
            assert.ok(fields[0].sortOrder < fields[1].sortOrder, 'Fields should have ascending sortOrder');
        });

        test('Empty and decorative rows are ignored', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: '____' },
                    { text: '***' },
                    { text: '---' },
                    { text: 'Vessel Name *' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.equal(fields.length, 1, 'Only the real field should survive');
            assert.equal(fields[0].label, 'Vessel Name');
        });

        test('Partial valid results survive', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: '___' },
                    { text: 'Ship Name *' },
                    { text: '***' },
                    { text: 'Deck condition Good Fair Poor' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.equal(fields.length, 2, 'Both valid fields should survive');
            assert.ok(fields.some(f => f.label === 'Ship Name'));
            assert.ok(fields.some(f => f.label === 'Deck condition'));
        });
    });

    describe('DOCX EVIDENCE TESTS', () => {
        test('Heading styles create sections', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: 'Inspection Information', bold: true, fontSize: 16 },
                    { text: 'Vessel Name *' },
                    { text: 'Dock Structure', bold: true, fontSize: 16 },
                    { text: 'Remarks *' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            const vesselField = fields.find(f => f.label === 'Vessel Name');
            const remarksField = fields.find(f => f.label === 'Remarks');

            assert.ok(vesselField, 'Vessel Name should exist');
            assert.ok(remarksField, 'Remarks should exist');
            assert.equal(vesselField.section, 'Inspection Information');
            assert.equal(remarksField.section, 'Dock Structure');
        });

        test('A new heading closes the previous section', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: 'Safety Assessment', bold: true, fontSize: 16 },
                    { text: 'Life jackets available? Yes No' },
                    { text: 'Equipment Verification', bold: true, fontSize: 16 },
                    { text: 'Fire extinguishers serviced? Yes No' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            const lifeField = fields.find(f => f.label.includes('Life jackets'));
            const fireField = fields.find(f => f.label.includes('Fire extinguishers'));

            assert.ok(lifeField);
            assert.ok(fireField);
            assert.equal(lifeField.section, 'Safety Assessment');
            assert.equal(fireField.section, 'Equipment Verification');
        });

        test('Abbreviation codes do not become fields', () => {
            // Short codes without labels, question marks or asterisks are filtered
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: 'Part B1' },
                    { text: 'Part B2' },
                    { text: 'Part C1' },
                    { text: 'Vessel Name *' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.ok(!fields.some(f => f.label === 'Part B1'), 'Code should not be a field');
            assert.ok(!fields.some(f => f.label === 'Part C1'), 'Code should not be a field');
            assert.ok(fields.some(f => f.label === 'Vessel Name'), 'Vessel Name should survive');
        });

        test("Instructions don't become fields", () => {
            const longInstruction = "A".repeat(201) + " This is an instruction that should not be converted to a field since it lacks a question mark and is very long.";
            const evidence = [{
                name: 'Page 1',
                lines: [{ text: longInstruction }]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.ok(!fields.some(f => f.label.includes('instruction')));
        });

        test('Label/answer cells create one field', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [{ text: 'Vessel Name *' }]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.equal(fields.length, 1, 'Should produce exactly one field');
            // normalizeLabel strips asterisks
            assert.equal(fields[0].label, 'Vessel Name');
            assert.equal(fields[0].required, true);
        });

        test('Yes/No table controls create one yes_no field', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [{ text: 'Life jackets available Yes No' }]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.equal(fields.length, 1);
            assert.equal(fields[0].type, 'yes_no');
        });

        test('Status infers select type', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [{ text: 'Superstructure condition Good Fair Poor' }]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.equal(fields[0].type, 'select');
            assert.deepEqual(fields[0].options, ['Good', 'Fair', 'Poor']);
        });

        test('Signature becomes signature', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [{ text: 'Inspector Signature *' }]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.equal(fields[0].type, 'signature');
        });

        test('Interleaved paragraph/table order is preserved', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: 'Vessel Name *' },
                    { text: 'Hull condition Good Fair Poor' },
                    { text: 'Remarks *' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            assert.ok(fields.length >= 3, 'Should produce at least 3 fields');
            assert.ok(fields[0].sortOrder < fields[1].sortOrder, 'Order should be ascending');
            assert.ok(fields[1].sortOrder < fields[2].sortOrder, 'Order should be ascending');
        });

        test('Fields are not all assigned to one section', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: 'Dock Structure', bold: true, fontSize: 16 },
                    { text: 'Vessel Name *' },
                    { text: 'Safety Assessment', bold: true, fontSize: 16 },
                    { text: 'Remarks *' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            const sections = new Set(fields.map(f => f.section));
            assert.ok(sections.size > 1, `Should have multiple sections, got: ${[...sections].join(', ')}`);
        });

        test('No field is created without source evidence', () => {
            const evidence = [{
                name: 'Page 1',
                lines: [
                    { text: 'Ship Name *' },
                    { text: 'Date *' }
                ]
            }];
            const pages = buildStructuredEvidence(evidence);
            const fields = suggestFieldsFromEvidence(pages);

            for (const field of fields) {
                assert.ok(field.label, 'Every field should have a label');
            }
        });

        test('Source-file assertions', async () => {
            const code = await source('../src/utils/templateSourceExtraction.js');

            // extractXlsx no longer joins cells with " | "
            const xlsxBlock = code.slice(code.indexOf('async function extractXlsx'));
            assert.ok(!xlsxBlock.includes('join(" | ")'), 'extractXlsx should not flatten cells with join(" | ")');

            // extractXlsx no longer uses Merged heading coordinate labels
            assert.ok(!xlsxBlock.includes('Merged heading ${range}'), 'extractXlsx should not use coordinate-based labels');
            assert.ok(!xlsxBlock.includes('`Merged heading'), 'extractXlsx should not use Merged heading prefix');

            // extractDocx processes nodes in document order using walker/childNodes
            const docxBlock = code.slice(code.indexOf('async function extractDocx'), code.indexOf('async function extractXlsx'));
            assert.ok(docxBlock.includes('childNodes') || docxBlock.includes('walker'), 'extractDocx should process nodes in document order');

            // extractXlsx reads styles.xml for date format detection
            assert.ok(xlsxBlock.includes('styles.xml'), 'extractXlsx should read styles.xml for date detection');
        });
    });
});
