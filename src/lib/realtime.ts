import { createClient } from '@/lib/supabase/client';

/**
 * Mengirim pesan broadcast real-time melalui websocket Supabase channel
 * Memastikan channel berstatus 'SUBSCRIBED' terlebih dahulu sebelum mengirim payload,
 * sehingga pesan real-time dipastikan terkirim ke semua klien yang mendengarkan.
 */
export async function sendRealtimeBroadcast(
  channelName: string,
  event: string,
  payload: any
): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  return new Promise<boolean>((resolve) => {
    try {
      const channel = supabase.channel(channelName, {
        config: { broadcast: { ack: true } },
      });

      let timeoutId: any = null;

      const cleanup = (success: boolean) => {
        if (timeoutId) clearTimeout(timeoutId);
        try {
          supabase.removeChannel(channel);
        } catch {}
        resolve(success);
      };

      timeoutId = setTimeout(() => cleanup(false), 2500);

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.send({
              type: 'broadcast',
              event,
              payload,
            });
            setTimeout(() => cleanup(true), 200);
          } catch (e) {
            console.warn('sendRealtimeBroadcast send error:', e);
            cleanup(false);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          cleanup(false);
        }
      });
    } catch (err) {
      console.warn('sendRealtimeBroadcast setup error:', err);
      resolve(false);
    }
  });
}
