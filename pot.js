#!/usr/bin/env node

import { CookingData, botw_sort } from './bundle.js';

let args = process.argv.slice(2);

if(args.length == 0) {
    args = ["-h"];
}

// Command line Arguments
let opts  = { verbose: false,  json_out: false,  pretty: false,  help: false, items: false };
let opt_v = { verbose: "-v",   json_out: "-j",   pretty: "-p",   help: "-h",  items: "-i" };
for(const [key,val] of Object.entries(opt_v)) {
    opts[key] = args.filter(arg => arg === val).length > 0;
    args = args.filter(arg => arg !== val);
}
if(opts.help) {
    console.log("pot.js -pjv args");
    console.log("       -j    json output")
    console.log("       -p    pretty json output")
    console.log("       -v    verbose, show internals")
    console.log("       -i    show items")
    console.log("       args  a list of items/ingredients, use quotes around items with spaces")
    console.log("             use '-' to read from stdin, comma delimited")
    process.exit(0);
}

const pot = new CookingData();

if(opts.items) {
    for(const key of Object.keys(pot.inames).sort(botw_sort)) {
        console.log(key);
    }
    process.exit(0);
}

const names = {
    'AttackUp': 'Mighty',
    'DefenseUp': 'Tough',
    'ResistCold': 'Spicy',
    'ResistHot': 'Chilly',
    'ResistElectric': 'Electro',
    'Fireproof': 'Fireproof',
    'MovingSpeed': 'Hasty',
    'Quietness': 'Sneaky',
};

function cook_and_show(arg, opts) {
    const res = pot.cook(arg, opts.verbose);
    if(res === undefined) {
        console.error("Error cooking", arg);
        return
    }

    if(opts.json_out || opts.pretty) {
        if(opts.pretty) {
            console.log(JSON.stringify(res, null, 2));
        } else {
            console.log(JSON.stringify(res));
        }
        return;
    }

    const items = res.items.join(", ");
    const suffix = `${res.price} ${items}`

    if(res.effect == 'LifeMaxUp') {
        console.log(`${res.name}: Hearty ${res.level} ${suffix}`);
    } else if(res.effect == 'ExGutsMaxUp') {
        console.log(`${res.name}: Enduring ${res.stamina_extra} ${suffix}`);
    } else if(res.effect == 'GutsRecover') {
        console.log(`${res.name}: Energizing ${res.stamina} ${suffix}`);
    } else if(Object.keys(names).includes(res.effect)) {
        console.log(`${res.name}: ${names[res.effect]} ${res.level}/${res.time} ${suffix}`);
    } else {
        console.log(`${res.name}: Hearts ${res.hearts} ${suffix}`);
    }
}
if(args[0] === "-") {
    let buffer = "";
    process.stdin.on('data', data => {
        //console.error(buffer.length, data.length)
        buffer += data.toString();
        let k = buffer.lastIndexOf("\n");
        const lines = buffer.slice(0,k).split("\n");
        buffer = buffer.slice(k);
        for(const line of lines) {
            if(line.trim().length <= 0) {
                continue
            }
            const items = line.split(",").map(item => item.trim());
            cook_and_show(items, opts);
        }
    });
} else {
    cook_and_show(args, opts);
}
