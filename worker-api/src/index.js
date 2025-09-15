import { createClient } from '@supabase/supabase-js';
import { AwsClient } from 'aws4fetch';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// 初始化 Supabase client
		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
		// /jobs/:id/url (GET)
		if (url.pathname.startsWith('/jobs/') && url.pathname.endsWith('/url') && request.method === 'GET') {
			const jobId = url.pathname.split('/')[2];

			// 查詢 DB 取 result_url
			const { data: job, error } = await supabase.from('jobs').select('*').eq('id', jobId).single();

			if (error || !job) {
				return new Response(JSON.stringify({ error: error?.message || 'Job not found' }), { status: 404 });
			}

			if (job.status !== 'Done' || !job.result_url) {
				return new Response(JSON.stringify({ error: 'Job not finished yet' }), { status: 400 });
			}

			// 解析 r2:// 格式 → bucket + key
			// 格式： r2://<bucket>/<path...>
			const parts = job.result_url.replace('r2://', '').split('/');
			const bucket = parts[0];
			const key = parts.slice(1).join('/');
			console.log('job.result_url', job.result_url, 'bucket', bucket, 'key', key);

			const client = new AwsClient({
				accessKeyId: env.R2_ACCESS_KEY_ID,
				secretAccessKey: env.R2_SECRET_ACCESS_KEY,
				service: 's3',
				region: 'auto',
			});

			const getUrl = new URL(`/${bucket}/${key}`, env.R2_ENDPOINT);
			// 產生簽名 URL（有效 1 分鐘）
			const signedRequest = await client.sign(getUrl.toString(), {
				method: 'GET',
				signQuery: true,
				expires: 60,
			});

			return new Response(JSON.stringify({ signedUrl: signedRequest.url }), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// /jobs/:id (GET)
		if (url.pathname.startsWith('/jobs/') && request.method === 'GET') {
			const jobId = url.pathname.split('/')[2];

			const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId).single();

			if (error) {
				return new Response(JSON.stringify({ error: error.message }), { status: 500 });
			}

			return new Response(JSON.stringify(data), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// /jobs (POST)
		if (url.pathname === '/jobs' && request.method === 'POST') {
			try {
				const { fileUrl, userId } = await request.json();

				if (!fileUrl) {
					return new Response(JSON.stringify({ error: 'fileUrl is required' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}

				// ✅ 先假裝一個固定 userId（mock auth）
				const finalUserId = userId || '4ff1cac7-7086-4128-bd83-7983ccd18db6';

				// 建立新 job
				const { data, error } = await supabase
					.from('jobs')
					.insert([
						{
							user_id: finalUserId,
							file_url: fileUrl,
							status: 'Queued',
						},
					])
					.select()
					.single();

				if (error) {
					return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
				}

				return new Response(JSON.stringify(data), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (err) {
				return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
			}
		}
		// /upload-url (POST)
		if (url.pathname === '/upload-url' && request.method === 'POST') {
			const { filename, contentType } = await request.json();
			const objectKey = crypto.randomUUID() + '-' + filename;

			const client = new AwsClient({
				accessKeyId: env.R2_ACCESS_KEY_ID,
				secretAccessKey: env.R2_SECRET_ACCESS_KEY,
				service: 's3',
				region: 'auto',
			});

			const putUrl = new URL(`/${env.R2_BUCKET_NAME}/uploads/${objectKey}`, env.R2_ENDPOINT);

			// ✅ 正確方式：把 signQuery: true 放進 options
			const signedRequest = await client.sign(putUrl.toString(), {
				method: 'PUT',
				headers: {
					'content-type': contentType,
				},
				signQuery: true,
				expires: 30, // URL 有效時間 (秒)
			});

			return new Response(
				JSON.stringify({
					uploadUrl: signedRequest.url, // 🔑 這裡應該會看到帶 X-Amz-Algorithm, X-Amz-Signature 等的 URL
					fileUrl: `r2://${env.R2_BUCKET_NAME}/uploads/${objectKey}`,
				}),
				{ headers: { 'Content-Type': 'application/json' } }
			);
		}

		return new Response('Not found', { status: 404 });
	},
};
