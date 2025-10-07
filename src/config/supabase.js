// src/config/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uqqqsvdktgznigcpbdqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcXFzdmRrdGd6bmlnY3BiZHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjE3OTYsImV4cCI6MjA3NTQzNzc5Nn0.rOIo2SSG7V8QtS2NWn0ZTPlXoZ8iDLJ6cLg164_8-f4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
