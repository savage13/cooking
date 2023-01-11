import { execSync } from 'child_process';
import fs from "fs";

import { CookingData } from './bundle.js' ;

const stop_on_error = process.argv.filter(arg => arg == "-k").length == 0;
const check_img = process.argv.filter(arg => arg == "-c").length;
const stop_on_missing_img = process.argv.filter(arg => arg == "-m").length ;

const obj = new CookingData;

const test_data = ['t/wkr.json', 't/dubious.json','t/acorns.json',
                   't/elixirs.json','t/quietness.json', 't/other.json',
                   't/fruitcake.json'];

let ok = 0;
let fails = 0;
let proof = 0;

const EFFECTS = ['LifeMaxUp','ExGutsMaxUp','GutsRecover','ResistCold','DefenseUp', 'AttackUp',
                 'ResistHot', 'ResistElectric', 'Quietness', 'MovingSpeed','Fireproof'];

function unique(z) {
    return [... new Set(z)];
}

function image_filename(known) {
    let items = unique(known.ingredients);
    items.sort();
    let out = [];
    for(const item of items) {
        let n = known.ingredients.filter(x => x == item).length;
        if(n == 1) {
            n = "";
        }
        out.push(`${item}${n}`);
    }
    out = 'img/' + out.join("_") + ".jpg";
    out = out.replace(/ /g, '_');
    return out;
}

function create_image(known) {
    console.log(known.name, known.ingredients);
    console.log("Missing img file");
    const out = image_filename(known);
    const res = execSync(`python ./img/grab.py ${out}`, {stdio: [process.stdin, process.stdout, process.stderr]})
}

function test_recipe(known) {
    //console.log("--------------------------------------------");
    let r = obj.cook(known.ingredients, false);//known.id == 11126);

    if((r.effect && ! EFFECTS.includes(r.effect)) ||
       (known.effect && ! EFFECTS.includes(known.effect)) ) {
        console.log("Error");
        console.log(known.name, known.ingredients);
        console.log(`Effect is unknown: returned '${r.effect}' != '${known.effect}' expected`);
        fails += 1;
        if(stop_on_error) {
            process.exit(1);
        }
    }
    
    if(!r || r.name != known.name || r.id != known.id) {
        console.log("********************************************");
        console.log("Error");
        console.log(known.name, known.ingredients);
        if(r.id != known.id) {
            console.log(`ID is incorrect: returned ${r.id} != ${known.id} expected`)
            console.log(`Returned ${r.id}: ${r.name}`);
            console.log(`Known    ${known.id}: ${known.name}`);
        }
        if(r.name != known.name) {
            console.log(`Name is incorrect: returned '${r.name}' != '${known.name}' expected`);
        }
        fails += 1;
        if(stop_on_error) {
            process.exit(1);
        }
    } else if(known.price !== undefined && r.price != known.price) {
        console.log(known.name, known.ingredients);
        if(r.price != known.price) {
            console.log(`Price is incorrect: returned '${r.price}' != '${known.price}' expected`);
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
    } else if(known.effect == "LifeMaxUp" && (r.potency != known.potency || r.level != known.level)) {
        console.log(known.name, known.ingredients);
        if(r.potency != known.potency) {
            console.log(`Potency is incorrect: returned '${r.potency}' != '${known.potency}' expected`);
        }
        if(r.level != known.level) {
            console.log(`Hearts Extra (level) is incorrect: returned '${r.level}' != '${known.level}' expected`);
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
    } else if(["ResistCold","DefenseUp", "AttackUp", "Fireproof", "ResistHot", "ResistElectric", "Quietness", "MovingSpeed"].includes(known.effect) && (r.potency != known.potency || r.time != known.time || r.level != known.level)) {
        console.log(known.name, known.ingredients);
        if(r.potency != known.potency) {
            console.log(`Potency is incorrect: returned '${r.potency}' != '${known.potency}' expected`);
        }
        if(r.time != known.time) {
            console.log(`Time is incorrect: returned '${r.time}' != '${known.time}' expected`);
        }
        if(r.level != known.level) {
            console.log(`Level is incorrect: returned '${r.level}' != '${known.level}' expected`);
        }
        fails += 1;
        if(stop_on_error) {
            process.exit(1);
        }
    } else {
        ok += 1;
    }
    if(known.price === undefined) {
        console.log("Price Missing for ", known.name);
    }
    if(known.img) {
        const img = image_filename(known);
        if(img != known.img) {
            console.log("Image filename inconsistent with naming scheme: ", known.img, img);
        }
        if(fs.existsSync(known.img)) {
            proof += 1;
        } else if(!check_img) {
            proof += 1;
        } else {
            console.log("img file is incorrect ", known.img);
            create_image(known);
            process.exit(1);
        }
    } else if(stop_on_missing_img) {
        create_image(known)
        process.exit(1);
    }
}


for (const file of test_data) {
    const knowns = JSON.parse(fs.readFileSync(file, 'utf8'));
    for(const known of knowns) {
        test_recipe(known)
    }
}
let total = fails + ok;
let proof_pct = 100 * proof / total;

console.log(`Tests ${total}: Ok: ${ok} Fails: ${fails} Proof: ${proof} (${proof_pct.toFixed(2)}%)`);




