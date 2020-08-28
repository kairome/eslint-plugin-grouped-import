import { RuleTester } from 'eslint';

import rule, { ruleMessages } from '../src/grouped-imports';

const tester = new RuleTester({ parserOptions: { ecmaVersion: 2015, sourceType: 'module' } });

const ruleOptions = [
  {
    'utils': [{ path: 'utils' }],
    'validations': [{ path: 'utils/validations' }],
    'api, selectors': [{ path: 'api/' }, { path: 'selectors/' }],
    'css': [{ path: '.css' }],
    'images': [{ path: '.png' }, { path: '.jpeg' }],
    'components': [{ path: 'components' }],
    'types': [{ path: 'types' }],
  }
];

const messages = {
  ...ruleMessages,
  noGroupComment: (comment: string) => `No comment found for import group "${comment}"`,
};

const runNoCommentsTest = () => {
  tester.run('Test noComments rule', rule, {
    valid: [],
    invalid: [
      {
        code: `
import s from 'styles';
import u from 'utils/functions';
      `,
        errors: [{ message: messages.noComments }],
        options: ruleOptions,
        output: `
import s from 'styles';
// utils
import u from 'utils/functions';
      `,
      },
      {
        code: `
import api from 'api/request';
import select from 'selectors/main';
      `,
        options: ruleOptions,
        errors: [{ message: messages.noComments }],
        output: `
// api, selectors
import api from 'api/request';
import select from 'selectors/main';
      `,
      },
      {
        code: `
import s from './Styles.css';
    `,
        options: ruleOptions,
        errors: [{ message: messages.noComments }],
        output: `
// css
import s from './Styles.css';
    `,
      },
      {
        code: `
import s from './Styles.css';
    `,
        options: ruleOptions,
        errors: [{ message: messages.noComments }],
        output: `
// css
import s from './Styles.css';
    `,
      },
    ],
  });
};

const runNoGroupCommentTest = () => {
  tester.run('Test noGroupComment rule', rule, {
    valid: [],
    invalid: [
      {
        code: `
// some comment
import u from 'utils/functions';
      `,
        errors: [{ message: messages.noGroupComment('utils') }],
        options: ruleOptions,
        output: `
// some comment
// utils
import u from 'utils/functions';
      `,
      },
      {
        code: `
// some comment
import { validate } from 'utils/validations';
      `,
        errors: [{ message: messages.noGroupComment('validations') }],
        options: ruleOptions,
        output: `
// some comment
// validations
import { validate } from 'utils/validations';
      `,
      },
      {
        code:
`// utils
import u from 'utils/functions';

import { validate } from 'utils/validations';
      `,
        errors: [{ message: messages.noGroupComment('validations') }],
        options: ruleOptions,
        output:
`// utils
import u from 'utils/functions';

// validations
import { validate } from 'utils/validations';
      `,
      },
      {
        code: `
// api, selectors
import api from 'api/request';
import select from 'selectors/main';
// new
import s from 'some';
import l from 'lists/data';
import u from 'utils';
      `,
        options: ruleOptions,
        errors: [{ message: messages.noGroupComment('utils') }],
        output: `
// api, selectors
import api from 'api/request';
import select from 'selectors/main';
// new
import s from 'some';
import l from 'lists/data';
// utils
import u from 'utils';
      `,
      },
      {
        code:
`// css
import s from './Styles.css';

// new
import bg from 'public/images/bj.jpeg';
    `,
        options: ruleOptions,
        errors: [{ message: messages.noGroupComment('images') }],
        output:
`// css
import s from './Styles.css';

// new
// images
import bg from 'public/images/bj.jpeg';
    `,
      },
      {
        code:
`// css
import s from './Styles.css';

import bg from 'public/images/bj.jpeg';
    `,
        options: ruleOptions,
        errors: [{ message: messages.noGroupComment('images') }],
        output:
`// css
import s from './Styles.css';

// images
import bg from 'public/images/bj.jpeg';
    `,
      },
    ],
  });
};

const runSequentialImportsTest = () => {
  tester.run('Test sequentialImports rule', rule, {
    valid: [],
    invalid: [
      {
        code:
`// api
import {
  uploadCandidateFile,
  removeCandidateFile,
  downloadCandidateFile,
} from 'api/candidate';

// api, selectors
import select from 'selectors/main';
      `,
        options: ruleOptions,
        errors: [{ message: messages.sequentialImports }],
        output:
`// api
// api, selectors
import {
  uploadCandidateFile,
  removeCandidateFile,
  downloadCandidateFile,
} from 'api/candidate';
import select from 'selectors/main';
      `,
      },
      {
        code:
`import React from 'react';

// validations
import { validateDate } from 'utils/validations';

// utils
import u from 'utils';

import { validateEmpty } from 'utils/validations';
      `,
        options: ruleOptions,
        errors: [{ message: messages.sequentialImports }],
        output:
`import React from 'react';

// validations
import { validateDate } from 'utils/validations';
import { validateEmpty } from 'utils/validations';

// utils
import u from 'utils';
      `,
      },
      {
        code:
`// css
import s from './Styles.css';
import bg from 'public/images/bj.jpeg';
import other from 'common/Common.css';
    `,
        options: ruleOptions,
        errors: [{ message: messages.sequentialImports }],
        output:
`// css
import s from './Styles.css';
import other from 'common/Common.css';

import bg from 'public/images/bj.jpeg';
    `,
      },
      {
        code:
`// css
import s from './Styles.css';
import bg from 'public/images/bj.jpeg';
import other from 'common/Common.css';
    `,
        options: ruleOptions,
        errors: [{ message: messages.sequentialImports }],
        output:
`// css
import s from './Styles.css';
import other from 'common/Common.css';

import bg from 'public/images/bj.jpeg';
    `,
      },
      {
        code: `
import { Account } from './account';
import {
  Entity1,
  Entity2,
  Entity3,
  Entity4,
  Entity5,
  Entity6,
} from './entities';
import {
  Script1, Script2, Script3, Script4,
} from './scripts';

// types
import {
  ScriptType1,
  ScriptType2,
  ScriptType3,
  ScriptType4,
} from 'types/scripts';
import { AccountType1, AccountType2 } from 'types/account';

// templates
import {
  TemplateType1,
  TemplateType2,
  TemplateType3,
  TemplateType4,
  TemplateType5,
  TemplateType6,
} from 'types/template';
import { TemplatesType } from 'types/templates';

// actions
import { Action } from 'actions/action';
import { ActionState } from 'actions/action/anotherAction';

import { Payload } from 'types/payload';
import { AuthType } from 'types/auth';
import { UserType } from 'types/user';
`,
        options: ruleOptions,
        errors: [messages.sequentialImports],
        output:
`import { Account } from './account';
import {
  Entity1,
  Entity2,
  Entity3,
  Entity4,
  Entity5,
  Entity6,
} from './entities';
import {
  Script1, Script2, Script3, Script4,
} from './scripts';

// types
import {
  ScriptType1,
  ScriptType2,
  ScriptType3,
  ScriptType4,
} from 'types/scripts';
import { AccountType1, AccountType2 } from 'types/account';
import {
  TemplateType1,
  TemplateType2,
  TemplateType3,
  TemplateType4,
  TemplateType5,
  TemplateType6,
} from 'types/template';
import { TemplatesType } from 'types/templates';
import { Payload } from 'types/payload';
import { AuthType } from 'types/auth';
import { UserType } from 'types/user';

// templates
// actions
import { Action } from 'actions/action';
import { ActionState } from 'actions/action/anotherAction';
`,
      }
    ],
  });
};

const runFirstImportTest = () => {
  tester.run('Test firstImport rule', rule, {
    valid: [],
    invalid: [
      {
        code: `
// api, selectors
import s from 'styles';
import check from 'dates';
import api from 'api/request';
import select from 'selectors/main';
      `,
        options: ruleOptions,
        errors: [{ message: messages.firstImport }],
        output:
`// api, selectors
import api from 'api/request';
import select from 'selectors/main';

import s from 'styles';
import check from 'dates';
      `,
      },
      {
        code: `
// css
import icon from 'icons/start.png';
import s from './Styles.css';
import anotherS from './MyStyles.css';
// images
import bg from 'public/images/bj.jpeg';
    `,
        options: ruleOptions,
        errors: [{ message: messages.firstImport }],
        output:
`// css
import s from './Styles.css';
import anotherS from './MyStyles.css';

import icon from 'icons/start.png';
// images
import bg from 'public/images/bj.jpeg';
    `,
      },
      {
        code:
`import {
  Main1,
  Main2,
  Main3,
  Main4,
  Main5,
  Main6,
} from 'types/main';
import { ReduxState } from 'types/redux';

// types
`,
        options: ruleOptions,
        errors: [{ message: messages.firstImport }],
        output:
`// types
import {
  Main1,
  Main2,
  Main3,
  Main4,
  Main5,
  Main6,
} from 'types/main';
import { ReduxState } from 'types/redux';
`,
      },
    ],
  });
};

const runEmptyLineAfterTest = () => {
  tester.run('Test emptyLineAfter rule', rule, {
    valid: [],
    invalid: [
      {
        code: `
// utils
import u from 'utils/functions';
import l from 'lists/data';
      `,
        options: ruleOptions,
        errors: [{ message: messages.emptyLineAfter }],
        output: `
// utils
import u from 'utils/functions';

import l from 'lists/data';
      `,
      },
      {
        code: `
// css
import s from './Styles.css';
// images
import icon from 'icons/start.png';
import bg from 'public/images/bj.jpeg';
    `,
        options: ruleOptions,
        errors: [{ message: messages.emptyLineAfter }],
        output: `
// css
import s from './Styles.css';

// images
import icon from 'icons/start.png';
import bg from 'public/images/bj.jpeg';
    `,
      },
    ],
  });
};

const runEmptyLineBeforeTest = () => {
  tester.run('Test emptyLineBefore rule', rule, {
    valid: [],
    invalid: [
      {
        code: `
// new
import s from 'some';
import l from 'lists/data';
// utils
import u from 'utils';
      `,
        options: ruleOptions,
        errors: [{ message: messages.emptyLineBefore }],
        output: `
// new
import s from 'some';
import l from 'lists/data';

// utils
import u from 'utils';
      `,
      },
      {
        code: `
import reducers from 'reducers';
// images
import icon from 'icons/start.png';
import bg from 'public/images/bj.jpeg';
    `,
        options: ruleOptions,
        errors: [{ message: messages.emptyLineBefore }],
        output: `
import reducers from 'reducers';

// images
import icon from 'icons/start.png';
import bg from 'public/images/bj.jpeg';
    `,
      },
    ],
  });
};

const runWithoutGroupTest = () => {
  tester.run('Test importsWithoutGroup rule', rule, {
    valid: [],
    invalid: [
      {
        code: `
// utils
import { check } from 'utils';

import l from 'lists/data';
      `,
        options: ruleOptions,
        errors: [{ message: messages.importsWithoutGroup }],
        output:
`import l from 'lists/data';

// utils
import { check } from 'utils';
      `,
      },
      {
        code: `
// utils
import { check } from 'utils';

import l from 'lists/data';
import some from './Some';

// validations
import { validateDate } from 'utils/validations';
      `,
        options: ruleOptions,
        errors: [{ message: messages.importsWithoutGroup }],
        output:
`import l from 'lists/data';
import some from './Some';

// utils
import { check } from 'utils';

// validations
import { validateDate } from 'utils/validations';
      `,
      },
      {
        code:
`import React from 'react';
import SomeField from './fields/SomeField';
import AnotherField from './fields/AnotherField';

// components
import { SelectField } from 'components/SelectField';
import Attachments from 'components/Attachments';

import { Model } from 'ui/model';

// types
import { FieldProps } from 'types/field';
import {
  Schema,
  // SchemaField,
  // SchemaPayload,
  CustomField,
} from 'types/schema';

// import
// Model
// OtherModel
// FieldModel
// } from 'types/model';
      `,
        options: ruleOptions,
        errors: [{ message: messages.importsWithoutGroup }],
        output:
`import React from 'react';
import SomeField from './fields/SomeField';
import AnotherField from './fields/AnotherField';
import { Model } from 'ui/model';

// components
import { SelectField } from 'components/SelectField';
import Attachments from 'components/Attachments';

// types
import { FieldProps } from 'types/field';
import {
  Schema,
  // SchemaField,
  // SchemaPayload,
  CustomField,
} from 'types/schema';

// import
// Model
// OtherModel
// FieldModel
// } from 'types/model';
      `,
      },
    ],
  });
};

const runValidTest = () => {
  tester.run('Test valid imports', rule, {
    valid: [
      {
        code:
`// utils
import u from 'utils/functions';
      `,
        options: ruleOptions,
      },
      {
        code:
`import l from 'lists/data';

// utils
import u from 'utils/functions';
      `,
        options: ruleOptions,
      },
      {
        code:
`// utils
import u from 'utils/functions';

// validations
import { validateEmpty } from 'utils/validations';
      `,
        options: ruleOptions,
      },
      {
        code:
`import l from 'lists/data';

// new
import s from 'some';
      `,
        options: ruleOptions,
      },
      {
        code:
`// new
import s from 'some';
import l from 'lists/data';

// api, selectors
import api from 'api/request';
import select from 'selectors/main';

// utils
import u from 'utils';
      `,
        options: ruleOptions,
      },
      {
        code:
`// api, selectors
import {
  uploadCandidateFile,
  removeCandidateFile,
  downloadCandidateFile,
} from 'api/candidate';
      `,
        options: ruleOptions,
      },
      {
        code:
`// css
import s from './Styles.css';
    `,
        options: ruleOptions,
      },
      {
        code:
` // css
import s from './Styles.css';

// images
import bg from 'public/images/bj.jpeg';
    `,
        options: ruleOptions,
      },
      {
        code:
`// images
import bg from 'public/images/bj.jpeg';
import png from 'icons/icon.png';

// css
import s from './Styles.css';
    `,
        options: ruleOptions,
      },
      {
        code:
`import l from 'lists/data';

// utils
import { check } from 'utils';
      `,
        options: ruleOptions,
      },
      {
        code:
`import l from 'lists/data';

// components
import Comp from 'components/Comp';

// css
import s from 'components/Comp.css';
      `,
        options: ruleOptions,
      },
      {
        code:
`
// css
import 'some.css';
// eslint-disable-next-line some-rule
import s from './Dashboard.css';
      `,
        options: ruleOptions,
      },

    ],
    invalid: [],
  });
};

(() => {
  runNoCommentsTest();
  runNoGroupCommentTest();
  runSequentialImportsTest();
  runWithoutGroupTest();
  runFirstImportTest();
  runEmptyLineAfterTest();
  runEmptyLineBeforeTest();
  runValidTest();
})();
