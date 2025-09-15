import { Router } from 'itty-router';
import { createClient } from '@supabase/supabase-js';
import { AwsClient } from 'aws4fetch';

// 初始化 router
const router = Router();

function getSupabase(env) {
	return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

// upload-url
router.post('/upload-url', async (request, env) => {
	try {
		const body = await request.json();
		const { filename, contentType } = body;
		if (!filename || !contentType) {
			return new Response(JSON.stringify({ error: 'filename and contentType required' }), { status: 400 });
		}

		const objectKey = crypto.randomUUID() + '-' + filename;

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
		const finalUser = userId || 'mock-user-id';

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
		const { params } = request; // handler gets request.params
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

// fallback
router.all('*', () => new Response('Not found', { status: 404 }));

// Export
export default { ...router }; // or router.fetch?
