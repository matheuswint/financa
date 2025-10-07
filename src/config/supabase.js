// src/config/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ojzqxryryymjserhofrt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qenF4cnlyeXltanNlcmhvZnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTY4OTksImV4cCI6MjA2NzU3Mjg5OX0.f-CrMwl4RcPbeyFQVra8rYPl3IEIg3qPdBFnwFSXdh8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
