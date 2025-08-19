import { useEffect, useRef } from 'react';
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";

const MediaControlsImproved = ({ 
  micEnabled, 
  cameraEnabled, 
  volumeEnabled, 
  setMicEnabled, 
  setCameraEnabled, 
  setVolumeEnabled,
  userData 
}) => {
  
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const lastVolumeState = useRef(null);

  // 🎤 CONTROL DE MICRÓFONO
  useEffect(() => {
    if (!localParticipant || micEnabled === undefined) return;
    
        
    // MÉTODO 1: LiveKit nativo
    localParticipant.setMicrophoneEnabled(micEnabled).catch(error => {
          });

    // MÉTODO 2: Control directo de WebRTC Senders
    if (window.livekitRoom?.engine?.pcManager?.publisher?.pc) {
      const pc = window.livekitRoom.engine.pcManager.publisher.pc;
      const senders = pc.getSenders();
      
      let controlledSenders = 0;
      senders.forEach((sender, index) => {
        if (sender.track && sender.track.kind === 'audio') {
          const oldEnabled = sender.track.enabled;
          sender.track.enabled = micEnabled;
          
          if (oldEnabled !== micEnabled) {
            controlledSenders++;
                      }
        }
      });
      
      if (controlledSenders > 0) {
              }
    }
    
  }, [micEnabled, localParticipant]);

  // 🎥 CONTROL DE CÁMARA
  useEffect(() => {
    if (!localParticipant || cameraEnabled === undefined) return;
    
        
    localParticipant.setCameraEnabled(cameraEnabled).catch(error => {
          });
    
  }, [cameraEnabled, localParticipant]);

  // 🔊 CONTROL DE VOLUMEN - VERSIÓN CORREGIDA
  useEffect(() => {
    // 🚫 SI ES MODELO, NO CONTROLAR VOLUMEN
    
    // ✅ APLICAR CONTROL INICIAL Y EN CAMBIOS
    const targetVolumeState = volumeEnabled !== false; // true por defecto si undefined
    
        
    // MÉTODO 1: Control de TODOS los elementos HTML audio (incluidos autoplay)
    const audioElements = document.querySelectorAll('audio');
    let controlledCount = 0;
    
    audioElements.forEach((audio, index) => {
      // ✅ CONTROLAR TODOS LOS AUDIOS (sin filtrar autoplay)
      const wasMuted = audio.muted;
      const wasVolume = audio.volume;
      
      audio.muted = !targetVolumeState;
      audio.volume = targetVolumeState ? 1 : 0;
      
      if (wasMuted !== audio.muted || wasVolume !== audio.volume) {
        controlledCount++;
              }
    });
    
    // MÉTODO 2: Control directo de WebRTC Receivers
    if (window.livekitRoom?.engine?.pcManager?.subscriber?.pc) {
      const pc = window.livekitRoom.engine.pcManager.subscriber.pc;
      const receivers = pc.getReceivers();
      
      receivers.forEach((receiver, index) => {
        if (receiver.track && receiver.track.kind === 'audio') {
          const wasEnabled = receiver.track.enabled;
          receiver.track.enabled = targetVolumeState;
          
          if (wasEnabled !== receiver.track.enabled) {
            controlledCount++;
                      }
        }
      });
    }
    
    // MÉTODO 3: Control de audio tracks en videos
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((video, index) => {
      if (video.srcObject) {
        const audioTracks = video.srcObject.getAudioTracks();
        audioTracks.forEach((track, trackIndex) => {
          // Solo tracks remotos (no micrófono local)
          if (!track.label.toLowerCase().includes('microphone')) {
            const wasEnabled = track.enabled;
            track.enabled = targetVolumeState;
            
            if (wasEnabled !== track.enabled) {
              controlledCount++;
                          }
          }
        });
      }
    });
    
    // MÉTODO 4: Control via LiveKit remote participants
    if (remoteParticipants && remoteParticipants.length > 0) {
      remoteParticipants.forEach((participant, index) => {
        if (participant.audioTracks) {
          participant.audioTracks.forEach((trackPub, trackKey) => {
            if (trackPub.track) {
              try {
                if (typeof trackPub.track.setEnabled === 'function') {
                  trackPub.track.setEnabled(targetVolumeState);
                  controlledCount++;
                                  }
              } catch (error) {
                              }
            }
          });
        }
      });
    }
    
        lastVolumeState.current = targetVolumeState;
    
  }, [volumeEnabled, remoteParticipants, userData?.role]); // ✅ Se ejecuta siempre que cambie volumeEnabled

  // 🔄 SINCRONIZACIÓN DE ESTADOS
  useEffect(() => {
    if (!localParticipant) return;
    
    const handleTrackMuted = (track) => {
      if (track.kind === 'audio' && setMicEnabled) {
                setMicEnabled(false);
      } else if (track.kind === 'video' && setCameraEnabled) {
                setCameraEnabled(false);
      }
    };

    const handleTrackUnmuted = (track) => {
      if (track.kind === 'audio' && setMicEnabled) {
                setMicEnabled(true);
      } else if (track.kind === 'video' && setCameraEnabled) {
                setCameraEnabled(true);
      }
    };

    localParticipant.on('trackMuted', handleTrackMuted);
    localParticipant.on('trackUnmuted', handleTrackUnmuted);

    return () => {
      localParticipant.off('trackMuted', handleTrackMuted);
      localParticipant.off('trackUnmuted', handleTrackUnmuted);
    };
  }, [localParticipant, setMicEnabled, setCameraEnabled]);

  // ✅ CONTROL INICIAL AL MONTAR (CRÍTICO)
  useEffect(() => {
    if (userData?.role === 'modelo') return;
    
    // Aplicar control inicial después de un breve delay
    const initTimer = setTimeout(() => {
            
      // Forzar el estado de volumen inicial
      const targetState = volumeEnabled !== false;
      
      // Control de todos los audios
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach((audio, index) => {
        audio.muted = !targetState;
        audio.volume = targetState ? 1 : 0;
              });
      
      // Control de WebRTC Receivers
      if (window.livekitRoom?.engine?.pcManager?.subscriber?.pc) {
        const pc = window.livekitRoom.engine.pcManager.subscriber.pc;
        const receivers = pc.getReceivers();
        
        receivers.forEach((receiver, index) => {
          if (receiver.track && receiver.track.kind === 'audio') {
            receiver.track.enabled = targetState;
                      }
        });
      }
      
    }, 1000);

    return () => clearTimeout(initTimer);
  }, [localParticipant, volumeEnabled, userData?.role]);

  // 🧹 CLEANUP al desmontar
  useEffect(() => {
    return () => {
      // Restaurar audio al desmontar (solo si era usuario)
      if (userData?.role !== 'modelo') {
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
          audio.muted = false;
          audio.volume = 1;
        });
              }
    };
  }, [userData?.role]);

  // 🔄 MONITOREO CONTINUO (solo si volumeEnabled es false)
  useEffect(() => {
    if (userData?.role === 'modelo' || volumeEnabled !== false) return;

        
    const monitorInterval = setInterval(() => {
      let foundActiveAudio = false;
      
      // Verificar elementos audio
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach((audio, index) => {
        if (!audio.muted || audio.volume > 0) {
                    audio.muted = true;
          audio.volume = 0;
          foundActiveAudio = true;
        }
      });
      
      // Verificar WebRTC Receivers
      if (window.livekitRoom?.engine?.pcManager?.subscriber?.pc) {
        const pc = window.livekitRoom.engine.pcManager.subscriber.pc;
        const receivers = pc.getReceivers();
        
        receivers.forEach((receiver, index) => {
          if (receiver.track && receiver.track.kind === 'audio' && receiver.track.enabled) {
                        receiver.track.enabled = false;
            foundActiveAudio = true;
          }
        });
      }
      
      if (foundActiveAudio) {
              }
      
    }, 3000); // Cada 3 segundos

    return () => {
            clearInterval(monitorInterval);
    };
  }, [volumeEnabled, userData?.role]);

  return null;
};

export default MediaControlsImproved;