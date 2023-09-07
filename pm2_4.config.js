module.exports = {
    apps: [{
        name: 'tool-solar-Ph4',
        script: './ph4.js',
        watch: false,
        env: {
            NODE_ENV: 'production'
        }
    }]
};