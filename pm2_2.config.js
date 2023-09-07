module.exports = {
    apps: [{
        name: 'tool-solar-Ph2',
        script: './ph2.js',
        watch: false,
        env: {
            NODE_ENV: 'production'
        }
    }]
};