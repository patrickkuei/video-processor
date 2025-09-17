import { Router } from 'itty-router';
import { createClient } from '@supabase/supabase-js';
import { AwsClient } from 'aws4fetch';

// 初始化 router
const router = Router();

// 全域 CORS middleware
async function handleCors(request, env) {
	const origin = request.headers.get('Origin');
	const allowed = env.ALLOWED_ORIGIN;

	const corsHeaders = {
		'Access-Control-Allow-Origin': allowed,
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	};

	// 處理 OPTIONS 預檢請求
	if (request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsHeaders });
	}

	return corsHeaders; // 回傳要加上的 headers
}

function getSupabase(env) {
	return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

const VALIDATION_CONFIG = {
	MAX_SIZE_MB: 10,
	ALLOWED_MIME_TYPES: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'],
	get MAX_SIZE_BYTES() {
		return this.MAX_SIZE_MB * 1024 * 1024;
	},
};

// upload-url
router.post('/upload-url', async (request, env) => {
	try {
		const body = await request.json();
		const { filename, contentType, fileSize } = body;
		if (!filename || !contentType || fileSize === undefined) {
			return new Response(JSON.stringify({ error: 'filename, contentType, and fileSize are required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (fileSize > VALIDATION_CONFIG.MAX_SIZE_BYTES) {
			return new Response(JSON.stringify({ error: `File size exceeds limit of ${VALIDATION_CONFIG.MAX_SIZE_MB}MB.` }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!VALIDATION_CONFIG.ALLOWED_MIME_TYPES.includes(contentType.toLowerCase())) {
			return new Response(
				JSON.stringify({ error: `Invalid file type. Please upload one of: ${VALIDATION_CONFIG.ALLOWED_MIME_TYPES.join(', ')}` }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const objectKey = crypto.randomUUID() + '-' + filename;
		console.log('env.R2_ACCESS_KEY_ID, ', env.R2_ACCESS_KEY_ID);
		const client = new AwsClient({
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY,
			service: 's3',
			region: 'auto',
		});

		const putUrl = new URL(`/${env.R2_BUCKET_NAME}/uploads/${objectKey}`, env.R2_ENDPOINT);
		const signedRequest = await client.sign(putUrl.toString(), {
			method: 'PUT',
			headers: { 'content-type': contentType },
			signQuery: true,
			expires: 30,
		});

		return new Response(
			JSON.stringify({
				uploadUrl: signedRequest.url,
				fileUrl: `r2://${env.R2_BUCKET_NAME}/uploads/${objectKey}`,
			}),
			{ headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
	}
});

// jobs POST
router.post('/jobs', async (request, env) => {
	try {
		const body = await request.json();
		const { fileUrl, userId } = body;
		if (!fileUrl) {
			return new Response(JSON.stringify({ error: 'fileUrl is required' }), { status: 400 });
		}
		const supabase = getSupabase(env);
		const finalUser = userId || '4ff1cac7-7086-4128-bd83-7983ccd18db6';

		const { data, error } = await supabase
			.from('jobs')
			.insert({ user_id: finalUser, file_url: fileUrl, status: 'Queued' })
			.select()
			.single();

		if (error) {
			return new Response(JSON.stringify({ error: error.message }), { status: 500 });
		}
		return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
	}
});

// jobs/:id GET
router.get('/jobs/:id', async (request, env) => {
	try {
		const supabase = getSupabase(env);
		const { params } = request;
		const { data, error } = await supabase.from('jobs').select('*').eq('id', params.id).single();

		if (error || !data) {
			return new Response(JSON.stringify({ error: error?.message || 'Not found' }), { status: 404 });
		}
		return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
	}
});

// jobs/:id/url GET
router.get('/jobs/:id/url', async (request, env) => {
	try {
		const supabase = getSupabase(env);
		const { params } = request;
		const { data: job, error } = await supabase.from('jobs').select('*').eq('id', params.id).single();

		if (error || !job) {
			return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
		}
		if (job.status !== 'Done' || !job.result_url) {
			return new Response(JSON.stringify({ error: 'Job not finished yet' }), { status: 400 });
		}
		const parts = job.result_url.replace('r2://', '').split('/');
		const bucket = parts[0];
		const key = parts.slice(1).join('/');
		const client = new AwsClient({
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY,
			service: 's3',
			region: 'auto',
		});
		const getUrl = new URL(`/${bucket}/${key}`, env.R2_ENDPOINT);
		const signedRequest = await client.sign(getUrl.toString(), {
			method: 'GET',
			signQuery: true,
			expires: 60,
		});
		return new Response(JSON.stringify({ signedUrl: signedRequest.url }), { headers: { 'Content-Type': 'application/json' } });
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
	}
});

// GET /jobs?userId=xxx
router.get('/jobs', async (request, env) => {
	try {
		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get('userId');

		if (!userId) {
			return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400 });
		}

		const { data, error } = await supabase.from('jobs').select('*').eq('user_id', userId).order('created_at', { ascending: false });

		if (error) {
			return new Response(JSON.stringify({ error: error.message }), { status: 500 });
		}

		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
	}
});

router.get('/wake', async (req, env) => {
	try {
		const resp = await fetch(env.NODE_WORKER_URL + '/health', { method: 'GET' });
		if (resp.ok) {
			return Response.json({ status: 'awake' });
		} else {
			return Response.json({ status: 'asleep' });
		}
	} catch (err) {
		return Response.json({ status: 'asleep' });
	}
});

// fallback
router.all('*', () => new Response('Not found', { status: 404 }));

export default {
	async fetch(request, env, ctx) {
		const cors = await handleCors(request, env);
		if (cors instanceof Response) return cors;

		const response = await router.fetch(request, env, ctx);
		if (response) {
			const newHeaders = new Headers(response.headers);
			for (const [k, v] of Object.entries(cors)) newHeaders.set(k, v);
			return new Response(await response.text(), {
				status: response.status,
				headers: newHeaders,
			});
		}

		return new Response('Not found', { status: 404, headers: cors });
	},
};
