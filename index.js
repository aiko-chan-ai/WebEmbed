import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import axios from 'axios';
import cron from 'node-cron';
import { JSDOM } from 'jsdom';
import morgan from 'morgan';
import config from './config.js';

const packageJSON = JSON.parse(
	fs.readFileSync('./package.json', 'utf-8').toString(),
);

const oembed = (provider_name, provider_url, author_name, author_url, url) => {
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
	if (url) {
		baseObject.url = url;
	}
	return baseObject;
};

// Main
const app = express();

app.use(bodyParser.json());

app.use(
	bodyParser.urlencoded({
		extended: true,
	}),
);
app.use(morgan('dev'));

app.use((req, res, next) => {
	res.header('Cache-Control', 'no-cache, no-store, must-revalidate'); // HTTP 1.1.
	res.header('Pragma', 'no-cache'); // HTTP 1.0.
	res.header('Expires', '0'); // Proxies.
	next();
});

// embed
app.get('/', (req, res) =>
	res
		.status(200)
		.send(
			`WebEmbed v${packageJSON.version} by Elysia<br>Github: https://github.com/aiko-chan-ai/WebEmbed`,
		),
);

app.get('/embed', (req, res) => {
	const dom = new JSDOM();
	const document = dom.window.document;
	if (
		req.query.image_type &&
		!['image', 'thumbnail'].includes(req.query.image_type)
	)
		return res
			.status(400)
			.send('Invalid image type specified\nType: "image" or "thumbnail"');
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
	if (provider_name || provider_url || author_name || author_url || url) {
		const query = new URLSearchParams();
		if (provider_name) {
			query.set('provider_name', provider_name);
		}
		if (provider_url) {
			query.set('provider_url', provider_url);
		}
		if (author_name) {
			query.set('author_name', author_name);
		}
		if (author_url) {
			query.set('author_url', author_url);
		}
		if (url) {
			query.set('url', url);
		}
		const oembedURL = './oembed?' + query.toString();
		const oEmbed = document.createElement('link');
		oEmbed.setAttribute('type', 'application/json+oembed');
		oEmbed.setAttribute('href', oembedURL);
		document.head.appendChild(oEmbed);
	}
	if (image_type == 'image') {
		const metaElement = document.createElement('meta');
		metaElement.setAttribute('name', 'twitter:card');
		metaElement.setAttribute('content', 'summary_large_image');
		document.head.appendChild(metaElement);
	}
	if (image) {
		const metaElement = document.createElement('meta');
		metaElement.setAttribute('property', 'og:image');
		metaElement.setAttribute('content', image);
		document.head.appendChild(metaElement);
	}
	if (color) {
		const metaElement = document.createElement('meta');
		metaElement.setAttribute('name', 'twitter:card');
		metaElement.setAttribute('content', 'summary_large_image');
		document.head.appendChild(metaElement);
	}
	if (description) {
		const metaElement = document.createElement('meta');
		metaElement.setAttribute('property', 'og:description');
		metaElement.setAttribute('content', description);
		document.head.appendChild(metaElement);
	}
	if (provider_name && !provider_url) {
		const metaElement = document.createElement('meta');
		metaElement.setAttribute('property', 'og:site_name');
		metaElement.setAttribute('content', provider_name);
		document.head.appendChild(metaElement);
	}
	if (title) {
		const metaElement1 = document.createElement('meta');
		metaElement1.setAttribute('property', 'og:title');
		metaElement1.setAttribute('content', title);
		document.head.appendChild(metaElement1);
		const metaElement2 = document.createElement('meta');
		metaElement2.setAttribute('property', 'twitter:title');
		metaElement2.setAttribute('content', title);
		document.head.appendChild(metaElement2);
	}
	if (url) {
		const metaElement1 = document.createElement('meta');
		metaElement1.setAttribute('property', 'og:url');
		metaElement1.setAttribute('content', url);
		document.head.appendChild(metaElement1);
		const metaElement2 = document.createElement('meta');
		metaElement2.setAttribute('property', 'twitter:url');
		metaElement2.setAttribute('content', url);
		document.head.appendChild(metaElement2);
		const metaElement3 = document.createElement('meta');
		metaElement3.setAttribute('name', 'url');
		metaElement3.setAttribute('content', url);
		document.head.appendChild(metaElement3);
	}
	if (video) {
		const type_meta = document.createElement('meta');
		type_meta.setAttribute('property', 'og:type');
		type_meta.setAttribute('content', 'video.other');
		const video_meta = document.createElement('meta');
		video_meta.setAttribute('property', 'og:video');
		video_meta.setAttribute('content', video);
		const video_secure_url = document.createElement('meta');
		video_secure_url.setAttribute('property', 'og:video:secure_url');
		video_secure_url.setAttribute('content', video);
		const video_width = document.createElement('meta');
		video_width.setAttribute('property', 'og:video:width');
		video_width.setAttribute('content', '1280');
		const video_height = document.createElement('meta');
		video_height.setAttribute('property', 'og:video:height');
		video_height.setAttribute('content', '720');
		const video_type = document.createElement('meta');
		video_type.setAttribute('property', 'og:video:type');
		video_type.setAttribute('content', 'text/html');
		document.head.appendChild(type_meta);
		document.head.appendChild(video_meta);
		document.head.appendChild(video_secure_url);
		document.head.appendChild(video_height);
		document.head.appendChild(video_width);
		document.head.appendChild(video_type);
	}
	if (redirect) {
		const redirectMeta = document.createElement('meta');
		redirectMeta.setAttribute('http-equiv', 'refresh');
		redirectMeta.setAttribute('content', `0; url=${redirect}`);
		document.head.appendChild(redirectMeta);
	}
	document.body.innerHTML = `<p>Copy <a href="" id="url">this URL</a> to Discord Message</p><p>Github: https://github.com/aiko-chan-ai/WebEmbed</p>`;
	const script = document.createElement('script');
	script.textContent = "(function () { const a = document.getElementById('url'); a.setAttribute('href', window.location.href) })();";
	document.body.appendChild(script);
	return res.status(200).send(dom.serialize());
});
// oembed metadata
app.get('/oembed', (req, res) => {
	const { provider_name, provider_url, author_name, author_url, url } =
		req.query;
	return res
		.status(200)
		.send(
			oembed(provider_name, provider_url, author_name, author_url, url),
		);
});

app.use(function (req, res) {
	res.status(404).send({
		msg: 'URL not found',
		code: 404,
		data: req.originalUrl + ' is incorrect',
	});
});

const server = app.listen(process.env.PORT ?? config.port, (error) => {
	if (error) return console.log(`Error: ${error}`);
	console.log(`PORT ${server.address().port}`);
    const task = cron.schedule('*/5 * * * *', () => {
		axios.get(process.env.WEBURL || config.WebURL).catch(() => {});
	});
    task.start();
});
