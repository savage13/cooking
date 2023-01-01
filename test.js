
import fs from "fs";

import { CookingData } from './bundle.js' ;

const obj = new CookingData;
const stop_on_error = true;

const test_data = ['wkr.json', 'dubious.json','acorns.json', 'elixirs.json'];

let ok = 0;
let fails = 0;

function test_recipe(known) {
    //console.log("--------------------------------------------");
    let r = obj.cook(known.ingredients, false);//known.id == 11126);

    if(!r || r.name != known.name || r.id != known.id) {
        console.log("********************************************");
        console.log("Error");
        console.log(known.name, known.ingredients);
        if(r.id != known.id) {
            console.log(`ID is incorrect: returned ${r.id} != ${known.id} expected`)
        }
        if(r.name != known.name) {
            console.log(`Name is incorrect: returned '${r.name}' != '${known.name}' expected`);
        }
        fails += 1;
        if(stop_on_error) {
            process.exit(1);
        }
    } else if(r.hp != known.hp) {
        console.log(known.name, known.ingredients);
        console.log(`HP is incorrect: returned '${r.hp}' != '${known.hp}' expected`);
        fails += 1;
        if(stop_on_error) {
            process.exit(1);
        }
    } else if(r.hearts != known.hearts) {
        console.log(known.name, known.ingredients);
        console.log(`Hearts is incorrect: returned '${r.hearts}' != '${known.hearts}' expected`);
        fails += 1;
        if(stop_on_error) {
            process.exit(1);
        }
    } else if(r.effect != known.effect) {
        console.log(known.name, known.ingredients);
        console.log(`Effect is incorrect: returned '${r.effect}' != '${known.effect}' expected`);
        fails += 1;
        if(stop_on_error) {
            process.exit(1);
        }
    } else if(known.effect == "LifeMaxUp" && (r.potency != known.potency || r.hearts_extra != known.hearts_extra)) {
        console.log(known.name, known.ingredients);
        if(r.potency != known.potency) {
            console.log(`Potency is incorrect: returned '${r.potency}' != '${known.potency}' expected`);
        }
        if(r.hearts_extra != known.hearts_extra) {
            console.log(`Hearts Extra is incorrect: returned '${r.hearts_extra}' != '${known.hearts_extra}' expected`);
        }
        fails += 1;
        if(stop_on_error) {
            process.exit(1);
        }
    } else if(known.effect == "ExGutsMaxUp" && (r.potency != known.potency || r.stamina_extra != known.stamina_extra)) {
        console.log(known.name, known.ingredients);
        if(r.potency != known.potency) {
            console.log(`Potency is incorrect: returned '${r.potency}' != '${known.potency}' expected`);
        }
        if(r.stamina_extra != known.stamina_extra) {
            console.log(`Stamina Extra is incorrect: returned '${r.stamina_extra}' != '${known.stamina_extra}' expected`);
        }
        fails += 1;
        if(stop_on_error) {
            process.exit(1);
        }
    } else if(known.effect == "GutsRecover" && (r.potency != known.potency || r.stamina != known.stamina)) {
        console.log(known.name, known.ingredients);
        if(r.potency != known.potency) {
            console.log(`Potency is incorrect: returned '${r.potency}' != '${known.potency}' expected`);
        }
        if(r.stamina != known.stamina) {
            console.log(`Stamina is incorrect: returned '${r.stamina}' != '${known.stamina}' expected`);
        }
        fails += 1;
        if(stop_on_error) {
            process.exit(1);
        }
    } else if(["ResistCold","DefenseUp", "AttackUp", "ResistHot", "ResistElectric", "Quiteness", "MovingSpeed"].includes(known.effect) && (r.potency != known.potency || r.time != known.time || r.effect_level != known.effect_level)) {
        console.log(known.name, known.ingredients);
        if(r.potency != known.potency) {
            console.log(`Potency is incorrect: returned '${r.potency}' != '${known.potency}' expected`);
        }
        if(r.time != known.time) {
            console.log(`Time is incorrect: returned '${r.time}' != '${known.time}' expected`);
        }
        if(r.effect_level != known.effect_level) {
            console.log(`Level is incorrect: returned '${r.effect_level}' != '${known.effect_level}' expected`);
        }
        fails += 1;
        if(stop_on_error) {
            process.exit(1);
        }
    } else {
        ok += 1;
    }
}


for (const file of test_data) {
    const knowns = JSON.parse(fs.readFileSync(file, 'utf8'));
    for(const known of knowns) {
        test_recipe(known)
    }
}
console.log(`Tests ${fails + ok}: Ok: ${ok} Fails: ${fails}`);




