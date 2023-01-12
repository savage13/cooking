import json from '@rollup/plugin-json';

export default {
    input: 'pot.js',
    output: {
        file: 'potb.js',
        format: 'es',
        name: 'CookingData',
    },
    plugins: [json()]
};
