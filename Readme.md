BotW Cooking
============

Simulate the cooking of ingredients in Breath of the Wild
including recipe, hearts, hp, stamina, effects, guts, ...

Usage
-----

```js
import { CookingData } from './bundle.js' ;

const pot = new CookingData();

const items = ["Hearty Durian", "Apple", "Wildberry"];
let r = pot.cook(items, false);

let r0 = {
   // Recipe Name
   name: 'Simmered Fruit',
   // Internal recipe ID / Index
   id: 98,
   // Required Actors for recipe
   actors: [],
   // Require Tags for recipe
   tags: [ [ 'CookFruit' ], [ 'CookFruit' ] ],
   // Items cooked in this specific recipe
   items: [ 'Hearty Durian', 'Apple', 'Wildberry' ],
   // GeneralParamList...CureItem.EffectLevel
   potency: 16,
   // GeneralParamList...CureItem.EffectType
   effect: 'LifeMaxUp',
   // Yellow Hearts; only for LifeMaxUp = potency / 4
   hearts_extra: 4,
}

// eek :|
console.log(JSON.stringify(r) === JSON.stringify(r0))
```

Development
-----------
This uses [rollup](https://rollupjs.org/guide/en/) to combine `index.js` with the json data files into a single module
called `bundle.js`. If you are not modifying the code or data files, you should be able to use `bundle.js` directly.
The name of this will change once it gets pushed into a npm module.

Bugs
----
Yes there are likely bugs, we are poking at a black box; please report them.

License
-------

BSD 2-Clause
