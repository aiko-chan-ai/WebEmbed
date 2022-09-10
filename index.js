import express from 'express';
import bodyParser from 'body-parser';
import { Collection } from '@discordjs/collection';
import config from './config.js';
import axios from 'axios';
const oembed = (provider_name, provider_url, author_name, author_url) => {
	const baseObject = {
		version: '1.0',
	};
	if (provider_name && provider_url) {
		baseObject.provider_name = provider_name;
		baseObject.provider_url = provider_url;
	}
	if (author_name) {
		baseObject.author_name = author_name;
	}
	if (author_url) {
		baseObject.author_url = author_url;
	}
	return baseObject;
};

// Main
const app = express();

const cache = new Collection() // Collection<path,full>

app.use(bodyParser.json());
app.use(
	bodyParser.urlencoded({
		extended: true,
	}),
);

const randomURLPath = (length = 6) => {
	const allChar =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += allChar.charAt(Math.floor(Math.random() * allChar.length));
	}
	return result;
};

// embed
app.get('/', (req, res) => res.status(200).send('hello world'));
// oembed: request to host
app.get('/embed', (req, res) => {
    if (req.query.image_type && !['image', 'thumbnail'].includes(req.query.image_type)) return res.status(400).send('Invalid image type specified\nType: "image" or "thumbnail"');
    const {
        provider_name,
        provider_url,
        author_name,
        author_url,
        image_type = 'thumbnail',
        image,
        video,
        color,
        url,
        description,
        title,
        redirect,
    } = req.query;
    let html = '<html>';
    html += '\n<head>';
    // join oembed
    let oembedURL = config.WebURL + 'oembed?';
    if (provider_name) {
        oembedURL += `provider_name=${encodeURIComponent(provider_name)}&`;
    }
    if (provider_url) {
        oembedURL += `provider_url=${encodeURIComponent(provider_url)}&`;
    }
    if (author_name) {
        oembedURL += `author_name=${encodeURIComponent(author_name)}&`;
    }
    if (author_url) {
        oembedURL += `author_url=${encodeURIComponent(author_url)}&`;
    }
    oembedURL = oembedURL.slice(0, -1);
    // add oembed to html
    html += `\n<link type="application/json+oembed" href="${oembedURL}" />`;
    if (image_type == 'image') {
        html += '\n<meta name="twitter:card" content="summary_large_image">';
    }
    if (image) {
        html += `\n<meta property="og:image" content="${image}">`;
    }
    if (color) {
        html += `\n<meta name="theme-color" content="${color}">`;
    }
    if (description) {
        html += `\n<meta property="og:description" content="${description}">`;
    }
    if (provider_name && !provider_url) {
        html += `\n<meta property="og:site_name" content="${provider_name}">`;
    }
    if (title) {
        html += `\n<meta content="${title}" property="og:title">`;
    }
    if (url) {
        html += `\n<meta content="${url}" property="og:url">`;
    }
    if (video) {
        html += `
<meta property="og:type" content="video.other">
<meta property="og:video" content="${video}">
<meta property="og:video:secure_url" content="${video}">
<meta property="og:video:width" content="1280">
<meta property="og:video:width" content="720" />
<meta property="og:video:type" content="text/html">`;
    }
    if (redirect) {
        html += `
<script type="text/javascript">
window.location.href = "${redirect}";
</script>\n`;
    }
    html += `
</head>
<body>
<p>Copy <a href="${config.WebURL}${req.originalUrl.slice(1)}">this URL</a> to Discord Message</p>
</body>
</html>`;
    return res.status(200).send(html);
});
// oembed metadata
app.get('/oembed', (req, res) => {
    const {
        provider_name,
        provider_url,
        author_name,
        author_url,
    } = req.query;
    return res.status(200).send(oembed(provider_name, provider_url, author_name, author_url));
});
app.get('/short', function(req, res) {
    const url = req.query.url;
    if (!url) {return res.status(400).send({ msg: 'error', code: 400 });}
    const randomURL = cache.findKey((v) => v == url) || randomURLPath(8);
    cache.set(randomURL, url);
    return res.status(200).send(`${config.WebURL}short/${randomURL}`);
});
app.get('/short/:path', async (req, res) => {
    const path = req.params.path;
    const data = cache.get(path);
    if (!data) {return res.status(404).send({ msg: 'error URL', code: 404 });}
    return res.redirect(data);
});
app.use(function(req, res) {
    res.status(404).send({
        msg: 'URL not found',
        code: 404,
        data: req.originalUrl + ' is incorrect',
    });
});
// Heroku not died
setInterval(async () => {
    await axios.get(config.WebURL).catch(e => {});
}, 1_000 * 60 * 10);
//
const server = app.listen(process.env.PORT ?? config.port, (error) => {
    if (error) return console.log(`Error: ${error}`);
    console.log(`PORT ${server.address().port}`);
});
