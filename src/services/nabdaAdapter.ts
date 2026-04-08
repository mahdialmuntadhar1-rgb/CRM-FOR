import { supabase } from '../lib/supabase';

interface SendPayload {
  messageId?: string;
  phone?: string;
  text?: string;
}

export const nabdaAdapter = {
  async processNextBatch(batchSize = 10, delayMs = 1200) {
    const { data, error } = await supabase.functions.invoke('nabda-queue-processor', {
      body: { batchSize, delayMs },
    });

    if (error) throw error;
    return data;
  },

  async sendSingle(payload: SendPayload) {
    const { data, error } = await supabase.functions.invoke('nabda-send', {
      body: payload,
    });

    if (error) throw error;
    return data;
  },
};
