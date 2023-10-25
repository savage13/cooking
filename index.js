
//import fs from "fs";
import RECIPES from './cook_recipes.json' assert { 'type': 'json' };
import DATA from './cook_items.json' assert { 'type': 'json' };
import NAMES from './names.json' assert { 'type': 'json' };
import CTAGS from './cook_tags.json' assert { 'type': 'json' };
import EFFECTS from './cook_effects.json' assert { 'type': 'json' };

const PRICE_SCALE = new Float32Array([0, 1.5, 1.8, 2.1, 2.4, 2.8]); // Cooking::CookData::NMMR
const CRIT_SCALE = [5, 10, 15, 20, 25]; // Cooking::CookData::NMSSR

// These should be computed using the CookSpice::BoostSuccessRate
//   added to the cook_items
const AlwaysCrit = [
    "Star Fragment",
    "Naydra's Scale",
    "Naydra's Claw",
    "Shard of Naydra's Fang",
    "Shard of Naydra's Horn",
    "Dinraal's Scale",
    "Dinraal's Claw",
    "Shard of Dinraal's Fang",
    "Shard of Dinraal's Horn",
    "Farosh's Scale",
    "Farosh's Claw",
    "Shard of Farosh's Fang",
    "Shard of Farosh's Horn"
];
const CritStamina = 0.4;

function array_pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

export class CookingData {
    constructor() {

        this.recipes = RECIPES;
        this.ctags = CTAGS;
        this.data = this.reduce_tags();
        this.names = NAMES;
        this.effects = EFFECTS;
        this.inames = {};
        this.all_recipe = [];
        this.set_proper_names();
        this.create_recipe_list();
        this.threshold = {
            "AttackUp": [5, 7],
            "DefenseUp": [5, 7],
            "ResistCold": [6, 999],
            "ResistHot": [6, 999],
            "ResistElectric": [4, 6],
            "Fireproof": [7, 999],
            "MovingSpeed": [5, 7],
            "Quietness": [6, 9],
            "LifeMaxUp": [999,999],
            "GutsRecover": [999,999],
            "ExGutsMaxUp": [999,999],
            'None': [999,999],
        }
    }

    items_with_tag(tag) {
        if(tag == "RoastItem") {
            return Object.fromEntries(
                Object.entries(this.data)
                    .filter(([key, value]) => value.roast_item)
            );
        }
        if(tag == "KeyItem") {
            return Object.fromEntries(
                Object.entries(this.data)
                    .filter(([key, value]) => value.key_item)
            );
        }
        return Object.fromEntries(
            Object.entries(this.data)
                .filter(([key, value]) => value.tags == tag)
        );
    }

    items() {
        return Object.keys(this.inames);
    }
    item(name) {
        return this.data[this.inames[name]];
    }

    create_recipe_list() {
        let id = 0;
        for(const rec of this.recipes) {
            const r = new Recipe(rec.name, rec.actors, rec.tags, id, rec.hb);
            this.all_recipe.push(r);
            id += 1;
        }
    }
    reduce_tags() {
        // Reduce tags in Items
        let out = {};
        for(const key of Object.keys(DATA)) {
            let row = { ... DATA[key] };
            row.tags = [ ... DATA[key].tags ];
            //row.tags = inter(row.tags, this.ctags);
            if(row.tags.length > 1) {
                console.error('Item has more than 1 cook tag', row.name, key);
                process.exit(1);
            }
            if(row.tags.length == 0) {
                row.tags = "";
            } else {
                row.tags = row.tags[0];
            }
            if(row.effect == '' || row.effect == 'None') {
                row.effect = undefined;
            }
            out[key] = row;
        }
        return out;
    }
    set_proper_names() {
        // Convert from UI Name to Internal Name
        const prefer = {
            "Hearty Radish": "Item_PlantGet_B",
            "Big Hearty Radish": "Item_PlantGet_C",
            "Endura Carrot": "Item_PlantGet_Q",
            "Swift Carrot": "Item_PlantGet_M",
            "Silent Princess": "Item_PlantGet_J",
            "Octo Balloon": "Item_Enemy_57",
            "Master Sword": "Item_Sword_071",
        };

        Object.keys(this.names).forEach(key => {
            if(key in this.data) {
                this.inames[ this.names[key] ] = key;
            }
        });
        Object.keys(prefer).forEach(key => {
            if(key in this.inames) {
                this.inames[key] = prefer[key];
            }
        });
        Object.keys(this.data).forEach(key => {
            if(!(key in this.names)) {
                console.log(`Missing ${key} from data`);
            }
        });
    }
    item_tags(items) {
        return items.map(key => this.data[key].tags);
    }
    items_names(items) {
        let iname = items.map(item => this.inames[item]);
        for(let i = 0; i < iname.length; i++) {
            if(!iname[i]) {
                console.log("Unknown item", items[i]);
                return undefined;
            }
        }
        return iname.filter(x => x);
    }
    find_recipe(items, verbose = false) {
        // Get internal names
        let iname = this.items_names(items);
        let tags_t = iname.map(key => this.data[key].tags);
        let N = 125;
        let i = N;
        for(const recipe of this.all_recipe.slice(N)) {
            if(verbose) {
                console.log("---------------------------------------------------");
            }
            if(recipe.matches(iname, tags_t, true, verbose)) {
                return recipe.clone();
            }
            i += 1;
        }
        i = 0;
        for(const recipe of this.all_recipe.slice(0, N)) {
            if(verbose) {
                console.log("---------------------------------------------------");
            }
            if(recipe.matches(iname, tags_t, false, verbose)) {
                return recipe.clone();
            }
            i += 1;
        }
        return undefined;
    }
    get_effect(name) {
        return this.effects.find(ef => ef.type == name);
    }

    /* Do Not Use This, the data structure does not match the current code */
    pick_boost(result) {
        const Bonus = Object.freeze({
            Life:    { name: "Life" },
            Stamina: { name: "Stamina" },
            Time:    { name: "Time"},
        });
        let bonus = Bonus.Time; // Hearts
        let effect = this.get_effect(result.effect);
        let life_recover = this.get_effect("LifeRecover");
        if(effect) {
            if(result.effect == "GutsRecover" || result.effect == "ExGutsMaxUp") {
                if(result.potency >= effect.max){
                    bonus = Bonus.Life;
                } else if(result.hp >= life_recover.max) {
                    bonus = Bonus.Stamina;
                } else {
                    bonus = array_pick(["LifeMaxUp", "GutsRecover"]);
                }
            } else if (result.effect == "LifeMaxUp") {
                bonus = bonus.Stamina;
            } else {
                if(result.potency < effect.max)  {
                    if(result.hp > life_recover.max) {
                        bonus = array_pick([Bonus.Time, Bonus.Stamina]);
                    } else {
                        bonus = array_pick([Bonus.Time, Bonus.Stamina, Bonus.Life]);
                    }
                } else if (result.hp >= life_recover.max) {
                    bounus = Bonis.Time;
                } else {
                    bonus = array_pick([Bonus.Time, Bonus.Life]);
                }
            }
        }
        if(bonus == Bonus.Life) {
            result.hp += life_recover.ssa;
        } else if(bound == Bouns.Time) {
            result.time_sec += 300; // seconds
        } else if(bound == Bouns.Stamina) {
            if(result.effect) {
                if(result.potency > 0 && result.potency < 1) {
                    result.potency = 1;
                }
                result.potency += effect.ssa;
            }
        }
    }

    cook_hp(items) {
        let r = this.cook(items, false);
        // Number of extra hearts is determined from potency
        //   this converts extra yellow hearts to hp and hp_crit
        let is_hearty = false;
        let has_crit_item = inter(items, AlwaysCrit).length > 0;
        let is_crit = false;
        let has_monster_extract = items.includes('Monster Extract');
        let is_dubious_food = r.name == "Dubious Food";
        let is_rock_hard_food = r.name == "Rock-Hard Food";
        if(r.effect == 'LifeMaxUp') {
            r.hp = r.level * 4;
            r.hp_crit = r.level_crit * 4;
            is_hearty = true;
            is_crit = has_crit_item;
        }
        if(r.effect === undefined) {
            is_crit = has_crit_item;
        }
        if(is_crit) {
            r.hp = r.hp_crit;
        }
        r.hp_crit = Math.min(r.hp_crit, 120)
        r.hp = Math.min(r.hp, 120)
        return [r.hp, r.price, r.hp != r.hp_crit,
                is_hearty,
                has_monster_extract && ! is_dubious_food && ! is_rock_hard_food];
    }

    cook(items, verbose = false) {
        let _inames = this.items_names(items);
        if(_inames === undefined) {
            return undefined;
        }

        let r = this.find_recipe(items, verbose);
        if(!r) {
            r = {name: "Dubious Food"};
        }
        let LifeRate = 2;
        let hp = 0;
        let time = 0;
        let potency = 0;
        let effect = [];
        let sell_price = 0;
        let buy_price = 0;
        for(const item of items) {
            const val = this.data[this.inames[item]];
            //console.log(val);
            if(val.effect) {
                const eff = this.get_effect(val.effect);
                if(verbose) {
                    console.log('effect', val.effect, eff.base_time);
                }
                time += eff.base_time;
            }

            if(verbose) {
                console.log('item,hp,potency,time',val.hp, val.potency,
                            val.time/30, item, this.inames[item], val.tags)
            }
            if(val.roast_item) {
                time += 30;
            } else {
                time += (val.time / 30) ;
            }
            if(val.effect) {
                potency += val.potency;
            }
            hp += val.hp;
            if(val.effect) {
                effect.push( val.effect );
            }
            if(val.cook_low_price) {
                sell_price += 1;
                buy_price += 1;
            } else {
                sell_price += val.sell_price || 0;
                buy_price += val.buy_price || 0;
            }
            //console.log(time, potency, effect);
        }
        hp *= LifeRate;

        effect = unique(effect);
        if(effect.length == 1) {
            effect = effect[0];
        } else {
            effect = 'None';
        }
        if(r.name == 'Elixir' && effect == 'None') {
            r.name = 'Dubious Food';
        }
        // https://gamefaqs.gamespot.com/boards/189707-the-legend-of-zelda-breath-of-the-wild/75108593
        // https://gaming.stackexchange.com/questions/302414/what-are-the-most-profitable-meals-and-elixirs-i-can-cook
        // https://www.reddit.com/r/zelda/comments/61ccva/botw_cooking_math_complete/
        // https://github.com/iTNTPiston/botw-recipe/blob/main/dump/find_recipes_simple.py:getPrice()
        // https://zelda.fandom.com/wiki/Cooking
        // BotW CookingMgr decomp
        // https://decomp.me/scratch/psBRW - cookHandleBoostSuccessInner
        // https://decomp.me/scratch/ht6nK - cook
        // https://decomp.me/scratch/0JThT - cookHandleBoostMonsterExtractInner
        // https://decomp.me/scratch/hbiAr - getCookEffectId
        // https://decomp.me/scratch/JZJo1 - cookCalcPotencyBoost
        // https://decomp.me/scratch/nrGeI - cookCalcSpiceBoost
        //
        // Values from Cooking/CookData.yml::System::NNMR
        const sp = items.map(item => this.item(item).sell_price);
        if(verbose) {
            console.log('sell price ',sp, ' scale', PRICE_SCALE[items.length]);
        }
        let sp32 = new Float32Array([sell_price])
        let sp_scale32 = new Float32Array([sp32[0] * PRICE_SCALE[ items.length ]]);
        sell_price = Math.ceil(Math.floor(sp_scale32) / 10) * 10;
        if(verbose) {
            console.log('sell price, round, buy',sp_scale32[0], sell_price, buy_price,
                        sp32[0],
                        PRICE_SCALE[items.length],
                        sp32[0] * PRICE_SCALE[items.length],
                       )
        }
        // Selling price is capped at buying price
        sell_price = Math.min(sell_price, buy_price);
        // Minimum price is limited to 2
        sell_price = Math.max(sell_price, 2);

        if(verbose) {
            console.log('time boosts', items
                        .map(item => this.data[this.inames[item]].time_boost)
                        .filter(isFinite));
        }
        let time_boost = items
            .map(item => this.data[this.inames[item]].time_boost)
            .filter(isFinite)
            .reduce((acc, t0) => { return acc + t0; }, 0);
        if(verbose) {
            console.log('hp boosts', unique(items)
                        .map(item => this.data[this.inames[item]].hp_boost)
                        .filter(isFinite));
        }
        let hp_boost = unique(items)
            .map(item => this.data[this.inames[item]].hp_boost)
            .filter(isFinite)
            .reduce((acc, t0) => { return acc + t0; }, 0);
        if(verbose) {
            console.log('time boost', time, '+', time_boost);
            console.log('hp boost', hp, '+', hp_boost);
        }

        time += time_boost;
        hp += hp_boost;

        let crits = items.map(item => this.item(item).boost_success_rate);
        let crit_rate = Math.max(...crits);
        crit_rate += CRIT_SCALE[ items.length - 1 ];
        if(verbose) {
            console.log('crits', crit_rate, crits, CRIT_SCALE[items.length-1]);
        }

        // Hit Point Boost(?); thanks Piston
        if(verbose) {
            if(r.hb != 0) {
                console.log('hp HB', r.hb);
            }
        }
        hp += r.hb;
        if(r.name == "Rock-Hard Food") {
            return rock_hard_food( unique(items).length, items );
        }
        if(r.name == "Dubious Food") {
            if(verbose) {
                console.log("recipe is dubious");
            }
            let hps = items.map(item => this.item(item))
                .map(item => item.hp)
                .reduce((acc, t0) => { return acc + t0; }, 0);
            let hp = (hps > 0) ? hps : 4;
            if(verbose) {
                console.log(items.map(item => this.item(item))
                            .map(item => [item.name,item.hp]));
            }
            return dubious_food( hp, items );
        }
        if(r.name == "Fairy Tonic") {
            effect = 'None';
            sell_price = 2;
        }
        let potency_level = '';
        let effect_level = 1;
        if(!(effect in this.threshold)) {
            console.error("Missing in threshold: ", effect);
        }

        if(potency >= this.threshold[effect][1]) {
            potency_level = 'High';
            effect_level = 3;
        } else if (potency >= this.threshold[effect][0]) {
            potency_level = 'Mid';
            effect_level = 2;
        } else {
            potency_level = 'Low';
            effect_level = 1;
        }

        const monster_rng = items.includes("Monster Extract") &&
              r.name != "Dubious Food" &&
              r.name != "Rock-Hard Food";

        const wmc = price_to_modifier(sell_price)

        let out = {
            name: r.name,
            id: r.id,
            actors: r.actors,
            tags: r.tags,
            items: items,
            hp: hp,
            time: time,
            potency: potency,
            effect_level_name: potency_level,
            level: Math.min(effect_level, 3),
            effect: effect,
            hearts: hp / 4,
            price: sell_price,
            // Crit Cooking
            hp_crit: hp + 3 * 4,      // Assumes +3 hearts
            time_crit: time + 5 * 60, // Assumes +05:00 duration
            level_crit: Math.min(effect_level + 1, 3),    // Assumes +1 potency tier
            crit_rate: crit_rate,
            monster_rng: monster_rng,
            wmc,
        }

        const effects = ["MovingSpeed", "AttackUp", "ResistCold", "ResistHot",
                         "DefenseUp", "ResistElectric", "Fireproof", "Quietness"];
        if(effects.includes(out.effect)) {
            out.time = Math.min(30*60, out.time);
            out.time_sec = out.time;
            out.time = t2ms(out.time_sec);
            out.time_crit = Math.min(30*60, out.time_crit);
            out.time_crit_sec = out.time_crit;
            out.time_crit = t2ms(out.time_crit);
        }
        if(out.effect == 'None') {
            delete out.time;
            delete out.potency;
            delete out.effect;
            delete out.level;
            delete out.effect_level_name;
            delete out.time_crit;
            delete out.level_crit;
        }
        if(out.effect == "LifeMaxUp") {
            delete out.time;
            delete out.time_crit;
            delete out.effect_level_name;
            delete out.hp_crit;
            out.hp = 0;
            out.hearts = 0;
            //out.hearts_extra = Math.floor(out.potency / 4);
            out.level = Math.floor(out.potency / 4);
            out.level_crit = out.level + 1;
        }
        if(out.effect == 'GutsRecover') {
            const recover = [0.0, 0.2, 0.4, 0.8, 1.0, 1.4, 1.6, 1.8, 2.2, 2.4, 2.8, 3.0]
            potency = Math.min(potency, recover.length-1);
            out.stamina = recover[potency];
            out.stamina_crit = Math.min(out.stamina + CritStamina, 3.0);
            delete out.time;
            delete out.time_crit;
            delete out.effect_level_name;
            delete out.level;
            delete out.level_crit;
        }
        if(out.effect == 'ExGutsMaxUp') {
            const recover = [
                {pts: 0, value: 0.0},
                {pts: 1, value: 0.2},
                {pts: 4, value: 0.4},
                {pts: 6, value: 0.6},
                {pts: 8, value: 0.8},
                {pts: 10, value: 1.0},
                {pts: 12, value: 1.2},
                {pts: 14, value: 1.4},
                {pts: 16, value: 1.6},
                {pts: 18, value: 1.8},
                {pts: 20, value: 2.0}
            ];
            potency = Math.min(20, potency);
            let tmp = recover.filter(v => v.pts <= potency).pop();
            out.stamina_extra = tmp.value;
            out.stamina_extra_crit = Math.min(out.stamina_extra + CritStamina, 2.0);

            delete out.time;
            delete out.time_crit;
            delete out.effect_level_name;
            delete out.level;
            delete out.level_crit;
        }
        if(out.name == 'Elixir' && out.effect != "None") {
            const elixirs = {
                "AttackUp": "Mighty Elixir",
                "DefenseUp": "Tough Elixir",
                "ResistCold": "Spicy Elixir",
                "ResistHot": "Chilly Elixir",
                "ResistElectric": "Electro Elixir",
                "Fireproof": "Fireproof Elixir",
                "MovingSpeed": "Hasty Elixir",
                "Quietness": "Sneaky Elixir",
                "ExGutsMaxUp": "Enduring Elixir",
                "GutsRecover": "Energizing Elixir",
                "LifeMaxUp": "Hearty Elixir",
            };
            out.name = elixirs[ out.effect ];
        }
        if(r.name == "Fairy Tonic" && items.includes("Monster Extract")) {
            // Using the maximum hp value
            //   - hp can be either 1 or 40 (=28+12)
            out.hp = out.hp_crit;
            out.hearts = out.hp / 4
        }
        return out;
    }
}

export function botw_sort(a, b) {
    const tags = [
        'Hearty Durian','Palm Fruit','Apple','Wildberry','Hydromelon',
        'Spicy Pepper','Voltfruit','Fleet-Lotus Seeds','Mighty Bananas','Big Hearty Truffle',
        'Hearty Truffle','Endura Shroom','Hylian Shroom','Stamella Shroom', 'Chillshroom',
        'Sunshroom', 'Zapshroom','Rushroom','Razorshroom','Ironshroom',
        //
        'Silent Shroom','Big Hearty Radish','Hearty Radish','Endura Carrot','Hyrule Herb',
        'Swift Carrot','Fortified Pumpkin','Cool Safflina','Warm Safflina','Electric Safflina',
        'Swift Violet', 'Mighty Thistle','Armoranth','Blue Nightshade', 'Silent Princess',
        'Raw Gourmet Meat','Raw Whole Bird','Raw Prime Meat','Raw Bird Thigh', 'Raw Meat',
        //
        'Raw Bird Drumstick','Courser Bee Honey','Hylian Rice','Bird Egg', 'Tabantha Wheat',
        'Fresh Milk', 'Acorn', 'Chickaloo Tree Nut', 'Cane Sugar','Goat Butter',
        'Goron Spice', 'Rock Salt','Monster Extract','Star Fragment',

        "Dinraal's Scale",
        "Dinraal's Claw",
        "Shard of Dinraal's Fang",
        "Shard of Dinraal's Horn",

        "Naydra's Scale",
        "Naydra's Claw",
        "Shard of Naydra's Fang",
        "Shard of Naydra's Horn",

        "Farosh's Scale",
        "Farosh's Claw",
        "Shard of Farosh's Fang",
        "Shard of Farosh's Horn",
        //
        'Hearty Salmon', 'Hearty Blueshell Snail','Hearty Bass','Hyrule Bass',
        'Staminoka Bass','Chillfin Trout', 'Sizzlefin Trout','Voltfin Trout','Stealthfin Trout',
        'Mighty Carp','Armored Carp','Sanke Carp','Mighty Porgy','Armored Porgy',
        //
        'Sneaky River Snail','Razorclaw Crab','Ironshell Crab', "Bright-Eyed Crab",'Fairy',
        'Winterwing Butterfly','Summerwing Butterfly',
        'Thunderwing Butterfly','Smotherwing Butterfly', 'Cold Darner',
        'Warm Darner','Electric Darner', 'Restless Cricket',
        'Bladed Rhino Beetle','Rugged Rhino Beetle',
        'Energetic Rhino Beetle','Sunset Firefly','Hot-Footed Frog','Tireless Frog','Hightail Lizard',
        //
        'Hearty Lizard','Fireproof Lizard','Flint','Amber','Opal',
        'Luminous Stone','Topaz','Ruby','Sapphire','Diamond',
        'Bokoblin Horn','Bokoblin Fang','Bokoblin Guts','Moblin Horn','Moblin Fang',
        'Moblin Guts','Lizalfos Horn','Lizalfos Talon','Lizalfos Tail','Icy Lizalfos Tail',
        //
        'Red Lizalfos Tail','Yellow Lizalfos Tail','Lynel Horn','Lynel Hoof','Lynel Guts',
        'Chuchu Jelly', "White Chuchu Jelly",'Red Chuchu Jelly','Yellow Chuchu Jelly','Keese Wing',
        'Ice Keese Wing','Fire Keese Wing','Electric Keese Wing','Keese Eyeball','Octorok Tentacle',
        'Octorok Eyeball','Octo Balloon', 'Molduga Fin','Molduga Guts','Hinox Toenail',
        //
        'Hinox Tooth','Hinox Guts','Ancient Screw','Ancient Spring','Ancient Gear',
        'Ancient Shaft', 'Ancient Core','Giant Ancient Core', 'Wood'
    ];
    const ai = tags.findIndex(v => v == a);
    const bi = tags.findIndex(v => v == b);
    if(ai < bi) {
        return -1;
    }
    if(ai > bi) {
        return 1;
    }
    return 0;
}


function inter(a,b) {
    return a.filter(value => b.includes(value));
}
function deepCopy(src) {
  let target = Array.isArray(src) ? [] : {};
  for (let key in src) {
    let v = src[key];
    if (v) {
      if (typeof v === "object") {
        target[key] = deepCopy(v);
      } else {
        target[key] = v;
      }
    } else {
      target[key] = v;
    }
  }

  return target;
}

class Recipe {
    constructor(name, actors, tags, id, hb) {
        this.name = name;
        this.actors = actors;
        this.tags = tags;
        this.verbose = false;
        this.id = id;
        this.hb = hb;
    }

    clone() {
        return new Recipe(`${this.name}`, deepCopy(this.actors),
                   deepCopy(this.tags), this.id, this.hb);
    }
    matches(items, tags, strict, verbose = false) {
        this.verbose = verbose;
        if(strict) {
            if(this.verbose) {
                console.log('init  ',this.name, this.id);
                console.log('strict mode')
            }
            if(unique(items).length != 1) {
                if(this.verbose) {
                    console.log('Number of unique items != 1')
                    console.log('   items:', unique(items))
                }
                return false;
            }
        }
        let items_t = [...items];
        let tags_t = [...tags];
        if(this.verbose) {
            console.log('init ', this.name, this.id);
            console.log('     items: ', items_t);
            console.log('      tags: ', tags_t);
            console.log('    actors: ', this.actors);
        }
        const out = this.matches_actors(items_t, tags_t, strict);
        items_t = out[0];
        tags_t = out[1];
        //console.log('     items: ', items_t);
        //console.log('      tags: ', tags_t);
        if(!items_t) {
            return false;
        }
        if(this.verbose) {
            console.log(' ');
            console.log('     items: ', items_t);
            console.log('      tags: ', tags_t);
            console.log('recipe tags:', this.tags);
        }
        items_t = this.matches_tags(items_t, tags_t, strict);
        if(this.verbose) {
            console.log(' ');
            console.log('     items: ', items_t);
        }
        if(!items_t) {
            return false;
        }
        if(this.verbose) {
            console.log('done ', this.name, items_t);
        }
        if(verbose == false) {
            //console.log("-------------------------------------------------");
            //this.matches(items, true);
        }
        //return items_t.length == 0;
        if(strict) {
            return items_t.length == 0;
        }
        return true;
    }
    matches_tags(items_t, tags_t, strict) {
        //let tags_t = items_t.map(key => cdata.data[key].tags);
        if(this.verbose) {
            console.log('  item tags:', tags_t);
        }
        if(strict) {
            if(this.tags.length == 0) {
                return items_t;
            }
            let v = inter(this.tags, tags_t);
            if(!v.length) {
                return undefined;
            }
            let k = tags_t.indexOf(v[0]);
            while(k != -1) {
                items_t.splice(k, 1);
                tags_t.splice(k, 1);
                k = tags_t.indexOf(v[0]);
            }
            return items_t;
        }

        let n = this.tags.length;
        for(let i = 0; i < n; i++) {
            //console.log(this.tags[i]);
            let item = undefined;
            if(Array.isArray(this.tags[i])) {
                for(let j = 0; j < this.tags[i].length; j++) {
                    if(this.verbose) {
                        console.log(this.tags[i], tags_t, i, j);
                    }
                    for(let k = 0; k < tags_t.length; k++) {
                        if(tags_t[k] == this.tags[i][j]) {
                            item = items_t[k];
                            if(this.verbose) {
                                console.log("   tag match: ", tags_t[k],this.tags[j]);
                            }
                            break
                        }
                    }
                }
            } else {
                let k  = tags_t.indexOf(this.tags[i]);
                item = items_t[k];
            }
            if(!item) {
                return undefined;
            }
            let k = items_t.indexOf(item);
            while(k != -1) {
                items_t.splice(k, 1);
                tags_t.splice(k, 1);
                k = items_t.indexOf(item);
            }
        }
        return items_t;
    }
    matches_actors(items_t, tags_t, strict) {
        if(strict) {
            if(this.actors.length == 0) {
                return [items_t, tags_t];
            }
            let v = inter(this.actors, items_t);
            if(!v.length) {
                return [undefined,undefined];
            }
            v = v[0];
            let k = items_t.indexOf(v);
            while(k != -1) {
                items_t.splice(k, 1);
                tags_t.splice(k, 1);
                k = items_t.indexOf(v);
            }
            return [items_t, tags_t];
        }
        let n = this.actors.length;
        for(let i = 0; i < n; i++) {
            if(this.verbose) {
                console.log(this.actors[i], items_t);
            }
            let v = inter(this.actors[i], items_t);
            if(!v.length) {
                return [undefined,undefined];
            }
            v = v[0];
            let k = items_t.indexOf(v);
            while(k != -1) {
                items_t.splice(k, 1);
                tags_t.splice(k, 1);
                k = items_t.indexOf(v);
            }
        }
        return [items_t, tags_t];
    }
}

function unique(z) {
    return [... new Set(z)];
}

function dubious_food( hp, items ) {
    const ID = 5;
    if(hp < 4) {
        hp = 4;
    }
    return {
        name: "Dubious Food",
        hp: hp,
        id: ID,
        hearts: hp/4,
        price: 2,
        items: items,
        hp_crit: hp,
    }
}
function rock_hard_food(n, items) {
    const SINGLE_ID = 126;
    const MULTI_ID = 3;
    return {
        name: "Rock-Hard Food",
        hp: 1,
        id: (n == 1) ? SINGLE_ID : MULTI_ID,
        hearts: 0.25,
        price: 2,
        items: items,
        hp_crit: 1,
    }
}

function t2ms(t) {
    const m = Math.floor(t / 60);
    const s = t % 60;
    const ms = m.toString().padStart(2, '0')
    const ss = s.toString().padStart(2, '0')
    return `${ms}:${ss}`;
}

function is_bit_set(value, k) {
    return (value & ( 1 << k )) != 0;
}

function price_to_modifier(price) {
    let out = {};
    let keys = ['Attack Up','Durability Up',
                'Critical Hit','Long Throw',
                'Multi Shot','Zoom','Quick Shot',
                'Surf Master','Shield Guard Up'];
    for(let i = 0; i < keys.length; i++) {
        out[keys[i]] = is_bit_set(price, i) ? 1 : 0;
    }
    out['Yellow Modifier'] = is_bit_set(price, 31) ? 1 : 0;
    return out;
}
