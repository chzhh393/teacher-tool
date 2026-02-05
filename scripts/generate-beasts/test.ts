/**
 * 即梦AI图片生成调试脚本
 *
 * 使用方法:
 *   1. 在 .env 中配置 VOLC_ACCESS_KEY_ID 和 VOLC_SECRET_ACCESS_KEY
 *   2. npm install
 *   3. npm run test
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============ 配置区域 - 可以修改这里来测试不同的提示词 ============

// 通用前缀和后缀
const PROMPT_PREFIX = '3D cute cartoon style, blind box toy style, C4D render, clean white background, high quality, 8k, ';
const PROMPT_SUFFIX = ' --no multiple views, no split screen, no text, no human';

// 测试用的提示词 - 可以从 prompts_library.md 复制过来测试
const TEST_PROMPT = 'One single Baby Unicorn, solo, sitting playfully, head tilted, extremely small and round body, big head, huge eyes, tiny horn nub, very soft fur, pastel pink and purple, chibi, white background';

// 输出文件名
const OUTPUT_FILENAME = 'test_unicorn_baby.png';

// ============ API 配置 ============

const API_CONFIG = {
  host: 'visual.volcengineapi.com',
  region: 'cn-north-1',
  service: 'cv',
  action: 'CVSync2AsyncSubmitTask',
  version: '2022-08-31',
};

// ============ 火山引擎签名实现 ============

function hmacSHA256(key: Buffer, content: string): Buffer {
  return crypto.createHmac('sha256', key).update(content, 'utf8').digest();
}

function hashSHA256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function getSignatureKey(secretKey: string, date: string, region: string, service: string): Buffer {
  const kDate = hmacSHA256(Buffer.from(secretKey, 'utf8'), date);
  const kRegion = hmacSHA256(kDate, region);
  const kService = hmacSHA256(kRegion, service);
  const kSigning = hmacSHA256(kService, 'request');
  return kSigning;
}

interface SignedRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

function signRequest(
  method: string,
  path: string,
  queryParams: Record<string, string>,
  body: string,
  accessKeyId: string,
  secretAccessKey: string
): SignedRequest {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  // 构建查询字符串
  const sortedParams = Object.keys(queryParams).sort();
  const canonicalQueryString = sortedParams
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  // 规范化请求头
  const headers: Record<string, string> = {
    'Host': API_CONFIG.host,
    'X-Date': amzDate,
    'Content-Type': 'application/json',
  };

  const signedHeaders = 'content-type;host;x-date';
  const canonicalHeaders = `content-type:application/json\nhost:${API_CONFIG.host}\nx-date:${amzDate}\n`;

  // 规范化请求
  const payloadHash = hashSHA256(body);
  const canonicalRequest = [
    method,
    path,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // 创建签名字符串
  const algorithm = 'HMAC-SHA256';
  const credentialScope = `${dateStamp}/${API_CONFIG.region}/${API_CONFIG.service}/request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    hashSHA256(canonicalRequest),
  ].join('\n');

  // 计算签名
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, API_CONFIG.region, API_CONFIG.service);
  const signature = hmacSHA256(signingKey, stringToSign).toString('hex');

  // 构建 Authorization 头
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  headers['Authorization'] = authorization;

  const url = `https://${API_CONFIG.host}${path}?${canonicalQueryString}`;

  return { url, headers, body };
}

// ============ 主逻辑 ============

interface SubmitResponse {
  ResponseMetadata: {
    RequestId: string;
    Action: string;
    Version: string;
    Service: string;
    Region: string;
    Error?: {
      Code: string;
      Message: string;
    };
  };
  task_id?: string;
}

interface ResultResponse {
  ResponseMetadata: {
    RequestId: string;
    Action: string;
    Version: string;
    Service: string;
    Region: string;
    Error?: {
      Code: string;
      Message: string;
    };
  };
  status?: string;
  resp_data?: string;
}

async function submitTask(prompt: string): Promise<string> {
  const accessKeyId = process.env.VOLC_ACCESS_KEY_ID;
  const secretAccessKey = process.env.VOLC_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('请设置 VOLC_ACCESS_KEY_ID 和 VOLC_SECRET_ACCESS_KEY 环境变量');
  }

  const fullPrompt = PROMPT_PREFIX + prompt + PROMPT_SUFFIX;

  console.log('📝 完整提示词:');
  console.log(fullPrompt);
  console.log('');

  // 构建请求体 - 即梦图片生成4.0的格式
  const requestBody = {
    req_key: 'jimeng_high_aes_general_v40',
    prompt: fullPrompt,
    model_version: 'general_v4.0',
    seed: -1,
    scale: 3.5,
    ddim_steps: 25,
    width: 1024,
    height: 1024,
    use_sr: true,
    return_url: true,
  };

  const body = JSON.stringify(requestBody);

  console.log('🚀 正在提交生成任务...');

  const queryParams = {
    Action: API_CONFIG.action,
    Version: API_CONFIG.version,
  };

  const signed = signRequest('POST', '/', queryParams, body, accessKeyId, secretAccessKey);

  const response = await fetch(signed.url, {
    method: 'POST',
    headers: signed.headers,
    body: signed.body,
  });

  const responseText = await response.text();
  console.log('📄 API响应:', responseText);

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} - ${responseText}`);
  }

  const result: SubmitResponse = JSON.parse(responseText);

  if (result.ResponseMetadata.Error) {
    throw new Error(`API错误: ${result.ResponseMetadata.Error.Code} - ${result.ResponseMetadata.Error.Message}`);
  }

  if (!result.task_id) {
    throw new Error('API未返回任务ID');
  }

  console.log('✅ 任务已提交，ID:', result.task_id);
  return result.task_id;
}

async function getResult(taskId: string): Promise<string> {
  const accessKeyId = process.env.VOLC_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.VOLC_SECRET_ACCESS_KEY!;

  const requestBody = {
    req_key: 'jimeng_high_aes_general_v40',
    task_id: taskId,
  };

  const body = JSON.stringify(requestBody);

  const queryParams = {
    Action: 'CVSync2AsyncGetResult',
    Version: API_CONFIG.version,
  };

  const signed = signRequest('POST', '/', queryParams, body, accessKeyId, secretAccessKey);

  const response = await fetch(signed.url, {
    method: 'POST',
    headers: signed.headers,
    body: signed.body,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`获取结果失败: ${response.status} - ${responseText}`);
  }

  const result: ResultResponse = JSON.parse(responseText);

  if (result.ResponseMetadata.Error) {
    throw new Error(`API错误: ${result.ResponseMetadata.Error.Code} - ${result.ResponseMetadata.Error.Message}`);
  }

  if (result.status === 'in_queue' || result.status === 'running') {
    return ''; // 还在处理中
  }

  if (result.status === 'done' && result.resp_data) {
    const respData = JSON.parse(result.resp_data);
    if (respData.image_urls && respData.image_urls.length > 0) {
      return respData.image_urls[0];
    }
  }

  throw new Error(`任务状态异常: ${result.status}`);
}

async function waitForResult(taskId: string, maxAttempts = 60): Promise<string> {
  console.log('⏳ 等待图片生成...');

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(2000); // 每2秒检查一次

    const imageUrl = await getResult(taskId);
    if (imageUrl) {
      return imageUrl;
    }

    process.stdout.write('.');
  }

  throw new Error('等待超时，图片生成未完成');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(url: string): Promise<Buffer> {
  console.log('\n📥 正在下载图片...');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`图片下载失败: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  console.log('='.repeat(50));
  console.log('即梦AI图片生成测试 (签名认证版)');
  console.log('='.repeat(50));
  console.log('');

  try {
    // 1. 提交生成任务
    const taskId = await submitTask(TEST_PROMPT);

    // 2. 等待结果
    const imageUrl = await waitForResult(taskId);

    console.log('🔗 图片URL:', imageUrl);
    console.log('');

    // 3. 下载并保存图片
    const imageBuffer = await downloadImage(imageUrl);

    // 保存到 beasts 目录
    const outputDir = path.resolve(__dirname, '../../app/public/beasts');
    const outputPath = path.join(outputDir, OUTPUT_FILENAME);

    fs.writeFileSync(outputPath, imageBuffer);

    console.log('✅ 图片已保存到:', outputPath);
    console.log('');
    console.log('🎉 测试完成!');

  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
