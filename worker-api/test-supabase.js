import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("*");
  console.log("accounts:", accounts, accErr);

  const { data: jobs, error: jobErr } = await supabase.from("jobs").select("*");
  console.log("jobs:", jobs, jobErr);
}

main();
