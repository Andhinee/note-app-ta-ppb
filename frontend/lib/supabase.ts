import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://erozetgipjrpuayhuqje.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyb3pldGdpcGpycHVheWh1cWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1MjY0OTUsImV4cCI6MjA1NzEwMjQ5NX0.63u4YIwdS0mnD2PuAKwQ4bCwsNUqGjDMouZR2ROaEh8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);