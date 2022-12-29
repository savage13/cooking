
import fs from "fs";

import { CookingData } from './bundle.js' ;

async function main() {
    const obj = await CookingData.init();
    //console.log('obj.cook',obj);
    const stop_on_error = true;
    //await crap.init();
    //console.log(obj.stuff());

    let ok = 0;
    let fails = 0;
    const knowns = JSON.parse(fs.readFileSync('./wkr.json', 'utf8'));
    for(const known of knowns) {
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
    console.log(`Tests ${fails + ok}: Ok: ${ok} Fails: ${fails}`);
}
main();
//console.log(cook(Array(5).fill("Mighty Bananas")))
//process.exit();

//let r;
//r = cook(["Mighty Porgy"])
// console.log(r);
// console.log();
// r = cook(["Mighty Porgy","Mighty Porgy"]);
// console.log(r);
// console.log();
// r = cook(["Mighty Porgy","Mighty Porgy","Mighty Porgy","Mighty Porgy","Mighty Porgy"]);
// console.log(r);
// console.log();
//r = cook(["Mighty Carp","Armored Carp","Sanke Carp","Mighty Porgy"]);
//console.log(r);
//r = cook(["Mighty Carp","Armored Carp","Sanke Carp"]);
//console.log(r);
//r = cook(["Mighty Carp","Stamella Shroom"])
//console.log(r);
//r = cook(["Endura Shroom","Stamella Shroom", "Sunshroom", "Chillshroom", "Zapshroom"])
//console.log(r);
//r = cook(["Endura Shroom","Stamella Shroom", "Sunshroom", "Chillshroom", "Wood"])
//console.log(r);
//module.exports = {
//    inames,
//    data,
//    CookingData,
//    init,
//    Recipe,
//    cook,
//};
//exports['default'] = {
//    cook
//}
//module.exports = {
//    cook
//}



