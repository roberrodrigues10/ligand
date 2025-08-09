import { useEffect } from 'react';
import { useLocalParticipant } from "@livekit/components-react";

const MediaControlsImproved = ({ 
  micEnabled, 
  cameraEnabled, 
  setMicEnabled, 
  setCameraEnabled 
}) => {
  const { localParticipant } = useLocalParticipant();

  // 🔥 CONTROL DE MICRÓFONO MEJORADO
  useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(micEnabled).catch(error => {
        console.warn('Error controlando micrófono:', error);
      });
    }
  }, [micEnabled, localParticipant]);

  // 🔥 CONTROL DE CÁMARA MEJORADO
  useEffect(() => {
    if (localParticipant) {
      localParticipant.setCameraEnabled(cameraEnabled).catch(error => {
        console.warn('Error controlando cámara:', error);
      });
    }
  }, [cameraEnabled, localParticipant]);

  // 🔥 MONITOREAR CAMBIOS DE DISPOSITIVOS
  useEffect(() => {
    if (localParticipant) {
      const handleTrackMuted = (track) => {
        if (track.kind === 'audio') {
          setMicEnabled(false);
        } else if (track.kind === 'video') {
          setCameraEnabled(false);
        }
      };

      const handleTrackUnmuted = (track) => {
        if (track.kind === 'audio') {
          setMicEnabled(true);
        } else if (track.kind === 'video') {
          setCameraEnabled(true);
        }
      };

      localParticipant.on('trackMuted', handleTrackMuted);
      localParticipant.on('trackUnmuted', handleTrackUnmuted);

      return () => {
        localParticipant.off('trackMuted', handleTrackMuted);
        localParticipant.off('trackUnmuted', handleTrackUnmuted);
      };
    }
  }, [localParticipant, setMicEnabled, setCameraEnabled]);

  // Este componente no renderiza nada visible, mantiene la lógica original
  return null;
};

export default MediaControlsImproved;