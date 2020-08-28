import { Rule } from 'eslint';
import { ImportDeclaration, SourceLocation } from 'estree';
import _ from 'lodash';

type GroupedImports = {
  [k: string]: ImportDeclaration[],
};

interface RuleOption {
  path: string,
}

type RuleOptions = {
  [k: string]: RuleOption[],
};

export const ruleMessages = {
  noComments: 'Imports must be accompanied by comments',
  noGroupComment: 'No comment found for import group "{{comment}}"',
  sequentialImports: 'All imports in a group must be sequential',
  firstImport: 'First import in a group must be preceded by a group comment',
  emptyLineBefore: 'Import group comment must be preceded by an empty line',
  emptyLineAfter: 'Last import in a group must be followed by an empty line',
  importsWithoutGroup: 'Imports without group must be at the top of the file',
};

const rule: Rule.RuleModule = {
  meta: {
    fixable: 'code',
    schema: [
      {
        type: 'object',
        patternProperties: {
          '^.*$': {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                },
              },
            },
          }
        },
        additionalProperties: false,
      }
    ],
    messages: ruleMessages,
  },
  create: (context) => {
    return {
      Program: (node) => {
        const options: RuleOptions = context.options[0];
        if (node.type === 'Program') {
          const importNodes = (_.filter(node.body, n => n.type === 'ImportDeclaration') as ImportDeclaration[]);

          // check if there are imports from config
          const optionValues = _.flatMap(options, values => _.map(values, v => v.path));
          const hasConfigImports = _.some(importNodes, (node) => {
            return _.some(optionValues, (v: string) => _.includes((node.source.value as string), v));
          });

          if (!hasConfigImports) {
            return;
          }

          const importComments = node.comments ? node.comments : [];
          const importsByGroup = getImportsByGroup(options, optionValues, importNodes);

          const commentKeys = _.keys(options);
          const sourceCode = context.getSourceCode();
          const lines = sourceCode.lines;
          const lastImportNode = importNodes[importNodes.length - 1];
          const lastImportNodeLine = (lastImportNode.loc as SourceLocation).end.line;
          const reversedComments = [...importComments].reverse();
          const lastCommentNode = _.find(reversedComments, c => _.includes(commentKeys, c.value.trim()));

          const lastCommentNodeLine = lastCommentNode ? (lastCommentNode.loc as SourceLocation).end.line : 0;
          const lastImportNodeRangeEnd = (lastImportNode.range as number[])[1];

          const getNewCodeLines = composeNewCodeLines(lines, lastCommentNodeLine, lastImportNodeLine);

          if (importComments.length === 0) {
            context.report({
              node,
              messageId: 'noComments',
              fix: (fixer) => {
                const fixes = _.map(importsByGroup, (group: ImportDeclaration[], commentKey) => {
                  if (_.isEmpty(group)) {
                    return;
                  }

                  const firstImport = group[0];
                  if (!firstImport.loc || !firstImport.range) {
                    return;
                  }

                  return fixer.insertTextBefore(firstImport, `// ${commentKey}\n`)
                });

                return (_.compact(fixes) as any);
              },
            });
            return;
          }

          _.some(importsByGroup, (group: ImportDeclaration[], commentKey) => {
            if (_.isEmpty(group)) {
              return false;
            }

            const importComment = _.find(importComments, c => c.value.trim() === commentKey);
            const firstImport = group[0];
            const lastGroupImport = group[group.length - 1];

            const firstGroupImportLine = (firstImport.loc as SourceLocation).start.line;
            const lastGroupImportLine = (lastGroupImport.loc as SourceLocation).end.line;

            if (!importComment) {
              context.report({
                node: firstImport,
                messageId: 'noGroupComment',
                data: {
                  comment: commentKey,
                },
                fix: (fixer) => {
                  return fixer.insertTextBefore(firstImport, `// ${commentKey}\n`);
                }
              });
              return true;
            }

            const groupImportTextRanges: [number, number][] = [];
            const allGroupImportTexts = _.flatMap(group, (g) => {
              const start = (g.loc as SourceLocation).start.line - 1;
              const end = (g.loc as SourceLocation).end.line;
              groupImportTextRanges.push([start, end - 1]);
              return lines.slice(start, end);
            });

            // sum up expected lines (support for multiline imports)
            const expectedLinesSum = _.sumBy(group, (g) => {
              const start = (g.loc as SourceLocation).start.line;

              // include eslint-disable comment in the overall line count
              const gComment = _.find(importComments, c => (c.loc as SourceLocation).start.line === start - 1);
              const disableLintComment = gComment && _.includes(gComment.value, 'eslint-disable');

              const gEnd = (g.loc as SourceLocation).end.line;
              const end = disableLintComment ? gEnd + 1 : gEnd;
              return end - start + 1;
            });

            const expectedLines = firstGroupImportLine + expectedLinesSum - 1;
            if (expectedLines !== lastGroupImportLine) {
              context.report({
                node: lastGroupImport,
                messageId: 'sequentialImports',
                fix: (fixer) => {

                  const insertAt = (importComment.loc as SourceLocation).end.line;
                  const newLines = getNewCodeLines(allGroupImportTexts, insertAt, groupImportTextRanges);

                  const fixes: any = [
                    fixer.removeRange([0, lastImportNodeRangeEnd]),
                    fixer.insertTextAfterRange([0, 0], newLines.join('\n')),
                  ];

                  return fixes;
                },
              });
              return true;
            }

            // check if first import is preceded by a group comment
            if (importComment.loc && (importComment.loc.start.line + 1 !== firstGroupImportLine)) {
              context.report({
                node: firstImport,
                messageId: 'firstImport',
                fix: (fixer) => {
                  const commentLine = (importComment.loc as SourceLocation).start.line;

                  const newLines =
                    getNewCodeLines(allGroupImportTexts, commentLine < 0 ? 0 : commentLine, groupImportTextRanges);

                  const commentEnd = lastCommentNode ? (lastCommentNode.range as number[])[1] : 0;
                  const insertAt = lastImportNodeRangeEnd > commentEnd ? lastImportNodeRangeEnd : commentEnd;
                  const fixes: any = [
                    fixer.removeRange([0, insertAt]),
                    fixer.insertTextAfterRange([0, 0], newLines.join('\n')),
                  ];
                  return fixes;
                },
              });
              return true;
            }

            // find token before the group comment
            const tokenBeforeComment = sourceCode.getTokenBefore(importComment, { skip: 0, includeComments: true });
            if (importComment.loc && tokenBeforeComment) {

              // check if line before the comment is an empty one
              const lineBeforeComment = lines[importComment.loc.start.line - 2];
              if (lineBeforeComment && lineBeforeComment.trim()) {
                context.report({
                  loc: importComment.loc,
                  messageId: 'emptyLineBefore',
                  fix: (fixer) => {
                    return fixer.insertTextBeforeRange((importComment.range as [number, number]), '\n');
                  },
                });
                return true;
              }
            }

            const lineAfterLastImport = lines[lastGroupImportLine];
            if (lineAfterLastImport.trim()) {
              context.report({
                node: lastGroupImport,
                messageId: 'emptyLineAfter',
                fix: (fixer) => {
                  return fixer.insertTextAfter(lastGroupImport, '\n');
                },
              });
              return true;
            }

            const importsWithGroup = _.flatMap(importsByGroup, g => g);
            const importsWithoutGroup = _.xor(importNodes, importsWithGroup);

            // find first group comment, don't count other comments
            const firstGroupImportComment = _.find(importComments, c => _.includes(commentKeys, c.value.trim()));

            const importsNotAtTheTop = firstGroupImportComment ? _.some(importsWithoutGroup, (g) => {
              return (g.loc as SourceLocation).start.line > (firstGroupImportComment.loc as SourceLocation).start.line;
            }) : false;

            if (importsNotAtTheTop && firstGroupImportComment) {
              context.report({
                node,
                messageId: 'importsWithoutGroup',
                fix: (fixer) => {
                  const excludeLines: [number, number][] = [];
                  const allImportLines: any = _.flatMap(importsWithoutGroup, (importNode) => {
                    const start = (importNode.loc as SourceLocation).start.line - 1;
                    const end = (importNode.loc as SourceLocation).end.line;
                    excludeLines.push([start, end - 1]);
                    return lines.slice(start, end);
                  });

                  const newLines = getNewCodeLines(allImportLines, 0, excludeLines);

                  const end = (lastImportNode.range as number[])[1];
                  const fixes: any = [
                    fixer.removeRange([0, end]),
                    fixer.insertTextAfterRange([0, 0], newLines.join('\n')),
                  ];


                  return fixes;
                },
              });

              return true;
            }

            return false;
          });
        }
      },
    };
  }
};

const getImportsByGroup = (
  options: RuleOptions, allOptionsPaths: string[], importNodes: ImportDeclaration[]
): GroupedImports => {
  return _.reduce(options, (acc, option, key) => {
    const groupPaths = _.map(option, o => o.path);
    const filteredImports = _.filter(importNodes, (node) => {
      return _.some(groupPaths, (groupPath) => {

        // check if there's a more specific path in option values
        const similarOptionValue =
          _.find(allOptionsPaths, optionValue => _.includes(optionValue, groupPath) && optionValue !== groupPath);
        const importValue = (node.source.value as string);
        const regularImport = _.includes(importValue, groupPath);
        const similarImport = _.includes(importValue, similarOptionValue) ||
          (/\.\w/gi.test(importValue) && !/\.\w/gi.test(groupPath));

        return regularImport && !similarImport;
      });
    });

    return {
      ...acc,
      [key]: filteredImports,
    };
  }, {});
};

const composeNewCodeLines = (
  lines: string[], lasCommentLine: number, lastImportLine: number
) => (newLines: string[], index: number, excludeLineNumbers: number[][]) => {
  const sliceEnd = lastImportLine > lasCommentLine ? lastImportLine : lasCommentLine
  const importLines = lines.slice(0, sliceEnd);

  const filteredLines = _.filter(importLines, (l, i) => {
    const inRange = _.find(excludeLineNumbers, range => i >= range[0] && i <= range[1]);
    return inRange === undefined;
  });

  filteredLines.splice(index, 0, '', ...newLines, '');

  const trimmedLines = _.filter(filteredLines, (line, index) => {
    const next = index + 1;
    const emptyLines = _.isEmpty(line) && _.isEmpty(filteredLines[next]) && next !== filteredLines.length;
    const emptyLineBeforeComment = _.isEmpty(line) && _.includes(filteredLines[index - 1], '//');
    const lastEmptyLine = _.isEmpty(line) && next === filteredLines.length;
    if (emptyLineBeforeComment) {
      return false;
    }
    return !emptyLines && !lastEmptyLine;
  });

  if (_.isEmpty(trimmedLines[0])) {
    return trimmedLines.slice(1);
  }

  return trimmedLines;
};

export default rule;
