process.env.GCLOUD_PROJECT = 'company-lunch-order';
const f = require('./functions/index.js');
f.analyzeMenuImage.run({
    data: {
        imageBase64: Buffer.from('test string').toString('base64'),
        storeType: 'meals',
        mimeType: 'image/jpeg'
    },
    auth: { uid: 'testuid' }
}).then(res => console.log('SUCCESS:', res)).catch(err => console.error('ERROR:', err));
