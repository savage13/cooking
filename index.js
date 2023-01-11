
//import fs from "fs";
import recipes from './cook_recipes.json' assert { 'type': 'json' };
import data from './cook_items.json' assert { 'type': 'json' };
import names from './names.json' assert { 'type': 'json' };
import ctags from './cook_tags.json' assert { 'type': 'json' };
import effects from './cook_effects.json' assert { 'type': 'json' };

export class CookingData {
    constructor() {

        this.recipes = recipes;
        this.data = data;
        this.names = names;
        this.ctags = ctags;
        this.effects = effects;
        this.inames = {};
        this.all_recipe = [];
        this.reduce_tags();
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
        for(const key of Object.keys(this.data)) {
            let row = this.data[key];
            row.tags = inter(row.tags, this.ctags);
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
        }
    }
    set_proper_names() {
        // Convert from UI Name to Internal Name
        const prefer = {
            "Hearty Radish": "Item_PlantGet_B",
            "Big Hearty Radish": "Item_PlantGet_C",
            "Endura Carrot": "Item_PlantGet_Q",
            "Swift Carrot": "Item_PlantGet_M",
            "Silent Princess": "Item_PlantGet_J",
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
                return recipe;
            }
            i += 1;
        }
        i = 0;
        for(const recipe of this.all_recipe.slice(0, N)) {
            if(verbose) {
                console.log("---------------------------------------------------");
            }
            if(recipe.matches(iname, tags_t, false, verbose)) {
                return recipe;
            }
            i += 1;
        }
        return undefined;
    }
    get_effect(name) {
        return this.effects.find(ef => ef.type == name);
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
                            val.time/30, item, this.inames[item])
            }
            time += (val.time / 30) ;
            if(item !== "Goron Spice") {
                potency += val.potency;
            }
            hp += val.hp;
            if(val.effect) {
                effect.push( val.effect );
            }
            sell_price += val.sell_price || 0;
            buy_price += val.buy_price || 0;
            //console.log(time, potency, effect);
        }
        hp *= LifeRate;

        effect = unique(effect);
        if(effect.length == 1) {
            effect = effect[0];
        } else {
            effect = 'None';
        }

        // https://gamefaqs.gamespot.com/boards/189707-the-legend-of-zelda-breath-of-the-wild/75108593
        // https://gaming.stackexchange.com/questions/302414/what-are-the-most-profitable-meals-and-elixirs-i-can-cook
        // https://github.com/iTNTPiston/botw-recipe/blob/main/dump/find_recipes_simple.py:getPrice()
        // Values from Cooking/CookData.yml::System::NNMR
        const PRICE_SCALE = [0, 1.5, 1.8, 2.1, 2.4, 2.8];
        const sp = items.map(item => this.item(item).sell_price);
        if(verbose) {
            console.log('sell price ',sp, ' scale', PRICE_SCALE[items.length]);
        }
        sell_price = Math.floor(sell_price * PRICE_SCALE[ items.length ]);
        const tmp = sell_price;
        sell_price = Math.ceil(sell_price / 10) * 10;
        if(verbose) {
            console.log('sell price, round, buy',tmp, sell_price, buy_price)
        }
        // Selling price is capped at buying price
        sell_price = Math.min(sell_price, buy_price);
        // Minimum price is limited to 2
        sell_price = Math.max(sell_price, 2);

        if(verbose) {
            console.log('time boosts', unique(items)
                        .map(item => this.data[this.inames[item]].time_boost)
                        .filter(isFinite));
        }
        let time_boost = unique(items)
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

        // Hit Point Boost(?); thanks Piston
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
            sell_price = 2; // CHECK THIS
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
            level: effect_level,
            effect: effect,
            hearts: hp / 4,
            price: sell_price,
        }

        const effects = ["MovingSpeed", "AttackUp", "ResistCold", "ResistHot",
                         "DefenseUp", "ResistElectric", "Fireproof", "Quietness"];
        if(effects.includes(out.effect)) {
            out.time = Math.min(30*60, out.time);
            out.time_sec = out.time;
            out.time = t2ms(out.time_sec);
        }
        if(out.effect == 'None') {
            delete out.time;
            delete out.potency;
            delete out.effect;
            delete out.level;
            delete out.effect_level_name;
        }
        if(out.effect == "LifeMaxUp") {
            delete out.time;
            //delete out.effect_level;
            delete out.effect_level_name;
            out.hp = 0;
            out.hearts = 0;
            //out.hearts_extra = Math.floor(out.potency / 4);
            out.level = Math.floor(out.potency / 4);
        }
        if(out.effect == 'GutsRecover') {
            const recover = [0.0, 0.2, 0.4, 0.8, 1.0, 1.4, 1.6, 1.8, 2.2, 2.4, 2.8, 3.0]
            potency = Math.min(potency, recover.length-1);
            out.stamina = recover[potency];
            delete out.time;
            delete out.effect_level_name;
            delete out.level;
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
            delete out.time;
            delete out.effect_level_name;
            delete out.level;
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
            //delete out.hp; // Not certain about this
        }
        return out;
    }
}


function inter(a,b) {
    return a.filter(value => b.includes(value));
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
    matches(items, tags, strict, verbose = false) {
        if(strict) {
            if(unique(items).length != 1) {
                return false;
            }
        }
        this.verbose = verbose;
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
        items: items
    }
}

function t2ms(t) {
    const m = Math.floor(t / 60);
    const s = t % 60;
    const ms = m.toString().padStart(2, '0')
    const ss = s.toString().padStart(2, '0')
    return `${ms}:${ss}`;
}



