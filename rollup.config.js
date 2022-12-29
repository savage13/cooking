import json from '@rollup/plugin-json';

export default {
    input: 'index.js',
    output: {
        file: 'bundle.js',
        format: 'es',
        name: 'CookingData',
    },
    plugins: [json()]
};
