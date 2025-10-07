// src/config/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hvhhtnovsbjtzokppsvu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2aGh0bm92c2JqdHpva3Bwc3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTQwMDQsImV4cCI6MjA3NTQzMDAwNH0.gA5vecl-O4lYAGPI2tKlUkNOxlsbOLp4xSDFm4FHII0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);