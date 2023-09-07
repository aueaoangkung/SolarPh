module.exports = {
    apps: [{
        name: 'tool-solar-Ph1',
        script: './ph1.js',
        watch: false,
        env: {
            NODE_ENV: 'production'
        }
    }]
};