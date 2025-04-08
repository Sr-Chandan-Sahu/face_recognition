import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
} from 'react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Camera,
  CameraRuntimeError,
  useCameraDevices,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {scanFaces} from 'vision-camera-face-detector';
import {runOnJS} from 'react-native-reanimated';
import {ImageObj} from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onFinish: (img: ImageObj) => void;
}

const invisibleColor = 'rgba(255, 255, 255, 0)';
const dangerColor = 'rgba(237, 35, 28, 0.8)';
const successColor = 'rgba(85, 198, 170, 0.8)';

const LoadingView = () => {
  return (
    <View style={styles.waitingContainer}>
      <ActivityIndicator size="large" color="white" />
      <Text style={styles.waitingText}>Initializing Camera</Text>
    </View>
  );
};

const ModalCameraAuto = ({visible, onClose, onFinish}: Props) => {
  const [isFace, setIsFace] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const camera = useRef<Camera>(null);
  const devices = useCameraDevices();
  const device = devices.front;

  const onError = useCallback((error: CameraRuntimeError) => {
    console.log('Error Camera: ', error);
    Alert.alert('Camera Error', error.message);
  }, []);

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    const faces = scanFaces(frame);

    if (faces.length > 0) {
      runOnJS(setIsFace)(true);
    } else {
      runOnJS(setIsFace)(false);
    }
  }, []);

  useEffect(() => {
    const takePicture = async () => {
      if (isCapturing) return;
      
      setIsCapturing(true);
      try {
        const photo = await camera.current?.takeSnapshot({
          flash: 'off',
          quality: 85,
          skipMetadata: true,
        });

        if (photo) {
          const {path} = photo;
          const namaFile = path.substring(
            path.lastIndexOf('/') + 1,
            path.length,
          );
          onFinish({
            uri: `file://${path}`,
            name: namaFile,
            type: 'image/jpeg',
          });
          onClose();
        }
      } catch (err: any) {
        Alert.alert('Error', String(err));
        console.log('error capture: ', String(err));
      } finally {
        setIsCapturing(false);
      }
    };
    
    if (isFace && visible && !isCapturing) {
      setTimeout(() => {
        takePicture();
      }, 500);
    } else {
      setIsFace(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFace, visible, isCapturing]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent>
      <SafeAreaView style={styles.modalContainer}>
        {device == null ? (
          <LoadingView />
        ) : (
          <View style={styles.cameraWrapper}>
            <StatusBar
              barStyle="light-content"
              translucent
              backgroundColor={invisibleColor}
            />
            
            <View style={styles.headerContainer}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.headerText}>Face Recognition</Text>
              <View style={styles.placeholder} />
            </View>
            
            <View style={styles.cameraContainer}>
              <Camera
                ref={camera}
                style={styles.camera}
                device={device}
                isActive={visible}
                photo={true}
                onError={onError}
                frameProcessor={frameProcessor}
                frameProcessorFps={3}
              />
              
              <View style={styles.overlayContainer}>
                <View style={styles.faceIndicatorContainer}>
                  <View 
                    style={[
                      styles.faceIndicator,
                      { backgroundColor: isFace ? successColor : dangerColor }
                    ]}
                  >
                    <Text style={styles.faceIndicatorText}>
                      {isFace ? 'Face Detected' : 'No Face Detected'}
                    </Text>
                  </View>
                </View>
                
                {isCapturing && (
                  <View style={styles.capturingContainer}>
                    <ActivityIndicator size="large" color="white" />
                    <Text style={styles.capturingText}>Capturing...</Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.footerContainer}>
              <Text style={styles.instructionText}>
                {isFace 
                  ? 'Position your face in the center' 
                  : 'Please position your face in the camera view'}
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default ModalCameraAuto;

const ScreenHeight = Dimensions.get('window').height;
const ScreenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraWrapper: {
    flex: 1,
    backgroundColor: 'black',
  },
  waitingContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: 'white', 
    fontSize: 18,
    marginTop: 15,
    fontWeight: '500',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
    aspectRatio: 3 / 4,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceIndicatorContainer: {
    position: 'absolute',
    top: 20,
    width: '100%',
    alignItems: 'center',
  },
  faceIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  faceIndicatorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  capturingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 15,
    fontWeight: '500',
  },
  footerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});
