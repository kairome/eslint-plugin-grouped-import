# eslint-plugin-grouped-imports

Organize your imports into meaningful groups. Each group is preceded by a comment specified in the rule options.

## Rule setup

1. Add `grouped-imports` to your plugins array in eslint config file.
2. Add rule `grouped-imports/group` to the list of your rules.

## Rule schema

```json
{
    "groupComment": [{ "path": "importPath" }]
}
```
Example of a config file

```json
{
  "selectors": [
    {
      "path": "selectors/"
    },
    {
      "path": "utils/useSelector"
    }
  ],
  "components": [
    {
      "path": "components/"
    }
  ]
}
```

## Internal configuration

Each path from the rule options is checked against the value of an import node to determine whether the node belongs in the group.
However, the rule checks if there exists a similar, more specific path in options that matches that path.
If so, the import node will be sorted into the group with the more specific path.
**Note**: imports with extensions, i.e. '.css', will **ALWAYS** take precedence.

The rule checks for 7 specific things which are described in the *Rule examples* section

## Rule examples

Assuming the example config file

### No comments

Error message: **Imports must be accompanied by comments**

This message appears when there are no comments that correspond to group names from the config file.

#### Invalid
```js
import SomeComponent from 'components/SomeComponent';
```

#### Valid
```js
// components
import SomeComponent from 'components/SomeComponent';
```

### No group comment

Error message: **No comment found for import group "{groupName}"**

This message appears when there are imports from the config file and no group comments.

#### Invalid
```js
// selectors
import { selectSomething } from 'selectors/something';

import SomeComponent from 'components/SomeComponent';
```

#### Valid
```js
// selectors
import { selectSomething } from 'selectors/something';

// components
import SomeComponent from 'components/SomeComponent';
```

### Sequential imports

Error message: **All imports in a group must be sequential**

This message appears when imports from the same group are not one after the other.

#### Invalid
```js
// selectors
import { selectSomething } from 'selectors/something';

// components
import SomeComponent from 'components/SomeComponent';

import { selectSomethingElse } from 'selectors/another';
```

#### Valid
```js
// selectors
import { selectSomething } from 'selectors/something';
import { selectSomethingElse } from 'selectors/another';

// components
import SomeComponent from 'components/SomeComponent';
```

### First group import

Error message: **First import in a group must be preceded by a group comment**

This message appears when there are import nodes and the comment from the config file, but the first group import is not preceded by the group comment.

#### Invalid
```js
// selectors
import s from './Styles.css';
import { selectSomething } from 'selectors/something';
```

#### Valid
```js
// selectors
import { selectSomething } from 'selectors/something';

import s from './Styles.css';
```

### Empty line before/after

Error message: **Import group comment must be preceded by an empty line** or **Last import in a group must be followed by an empty line**

This message appears when import groups are not padded by empty lines.

#### Invalid
```js
import utils from 'utils';
// selectors
import { selectSomething } from 'selectors/something';
// components
import SomeComponent from 'components/SomeComponent';
// types
```

#### Valid
```js
import utils from 'utils';

// selectors
import { selectSomething } from 'selectors/something';

// components
import SomeComponent from 'components/SomeComponent';

// types
```

### Imports without a group

Error message: **Imports without group must be at the top of the file**

This message appears when the rest of the imports that don't belong in any of the groups from the config, are not at the top of the file.

#### Invalid
```js
// selectors
import { selectSomething } from 'selectors/something';

import utils from 'utils';   

// components
import SomeComponent from 'components/SomeComponent';

import s from './Styles.css'
```

#### Valid
```js
import utils from 'utils';   
import s from './Styles.css'

// selectors
import { selectSomething } from 'selectors/something';

// components
import SomeComponent from 'components/SomeComponent';
```
