// api/cleanup-cron.js
export default async function handler(req, res) {
  console.log('🔄 [VERCEL-CRON] Iniciando limpieza de notificaciones...');
  
  // Verificar que es llamada desde Vercel Cron
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (authHeader !== expectedAuth) {
    console.error('❌ [VERCEL-CRON] Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const backendUrl = process.env.BACKEND_URL;
    const cleanupSecret = process.env.CLEANUP_SECRET;
    
    if (!backendUrl || !cleanupSecret) {
      throw new Error('Missing environment variables');
    }

    const cleanupUrl = `${backendUrl}/api/cleanup-notifications/${cleanupSecret}`;
    console.log('📡 [VERCEL-CRON] Llamando backend:', cleanupUrl);

    const response = await fetch(cleanupUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Vercel-Cron/1.0',
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ [VERCEL-CRON] Cleanup exitoso:', data);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Cleanup executed successfully',
        backend_response: data,
        timestamp: new Date().toISOString()
      });
    } else {
      const errorText = await response.text();
      throw new Error(`Backend error ${response.status}: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ [VERCEL-CRON] Error:', error.message);
    
    return res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}