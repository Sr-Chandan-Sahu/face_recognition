/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  CameraRuntimeError,
  useCameraDevices,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {scanFaces} from 'vision-camera-face-detector';
import {runOnJS} from 'react-native-reanimated';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  compareFaceDescription,
  saveFaceDescription,
} from './src/utils/storage';

// Types
interface ImageObj {
  uri: string;
  name: string;
  type: string;
}

// Constants
const defaultAva =
  'https://media.gettyimages.com/id/1227618801/vector/human-face-avatar-icon-profile-for-social-network-man-vector-illustration.jpg?s=2048x2048&w=gi&k=20&c=a8O0jXGeYVFI9TCguB1f-7sFDsinMVJnoEpbEg4yhvY=';

const invisibleColor = 'rgba(255, 255, 255, 0)';
const dangerColor = 'rgba(237, 35, 28, 0.8)';
const successColor = 'rgba(85, 198, 170, 0.8)';

// Permission Hook
const useGetPermission = ({onFinish}: {onFinish?: () => Promise<void>}) => {
  const savedOnFinish = useRef<() => Promise<void>>(async () => {});

  savedOnFinish.current = async () => {
    if (onFinish) {
      await onFinish();
    }
  };

  useEffect(() => {
    const getPermissions = async () => {
      await Camera.getCameraPermissionStatus().then(async status => {
        console.log('permission camera: ', status);
        if (status === 'authorized') {
          return;
        }

        const cameraRequest = await Camera.requestCameraPermission();
        if (cameraRequest === 'authorized') {
          Alert.alert('Permission Granted', `Camera permission ${cameraRequest}`);
          return;
        }
      });

      await savedOnFinish.current();
    };

    getPermissions();
  }, []);
};

// Camera Modal Component
const CameraModal = ({
  visible,
  onClose,
  onFinish,
}: {
  visible: boolean;
  onClose: () => void;
  onFinish: (img: ImageObj) => void;
}) => {
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
  }, [isFace, visible, isCapturing, onClose, onFinish]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent>
      <SafeAreaView style={styles.modalContainer}>
        {device == null ? (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.waitingText}>Initializing Camera</Text>
          </View>
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

// Main App Component
const App = () => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [registeredImg, setRegisteredImg] = useState('');
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [currentImg, setCurrentImg] = useState<ImageObj | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [similarity, setSimilarity] = useState('');

  // Use permission hook
  useGetPermission({});

  const openCamera = useCallback(() => {
    setIsCameraOpen(true);
  }, []);

  const closeCamera = useCallback(() => {
    setIsCameraOpen(false);
  }, []);

  const matchFaces = useCallback(
    async (imgPost: string) => {
      if (!registeredImg || !imgPost) {
        return;
      }
      setLoadingMatch(true);

      try {
        const response = await compareFaceDescription({
          face_description: registeredImg,
          image: imgPost,
        });

        console.log('res: ', response);

        if (response.isMatch) {
          setSimilarity(`${response.similar}%`);
          setLoadingMatch(false);
          return;
        }

        setSimilarity('Not Match');
        setLoadingMatch(false);
      } catch (error) {
        console.log('error match: ', error);
        setSimilarity('Error');
        setLoadingMatch(false);
      }
    },
    [registeredImg],
  );

  const handleRegisFace = useCallback(async (val: ImageObj) => {
    setLoadingRegister(true);
    try {
      const imgBase64 = await ReactNativeBlobUtil.fs.readFile(
        val.uri,
        'base64',
      );

      const foundFace = await saveFaceDescription({image: imgBase64});
      setRegisteredImg(foundFace.face_description);
      setLoadingRegister(false);
    } catch (error) {
      console.log('error regis: ', error);
      setLoadingRegister(false);
    }
  }, []);

  const handleSetImage = useCallback(
    async (val: ImageObj) => {
      if (registeredImg) {
        setCurrentImg(val);
        const imgBase64 = await ReactNativeBlobUtil.fs.readFile(
          val.uri,
          'base64',
        );
        await matchFaces(imgBase64);
        return;
      }

      await handleRegisFace(val);
    },
    [registeredImg, handleRegisFace, matchFaces],
  );

  const clearResults = useCallback((isLogout?: boolean) => {
    if (isLogout) {
      setRegisteredImg('');
    }
    setCurrentImg(null);
    setSimilarity('');
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Face Recognition</Text>
        </View>
        
        <CameraModal
          visible={isCameraOpen}
          onClose={closeCamera}
          onFinish={handleSetImage}
        />
        
        {!registeredImg ? (
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              You're not registered{' '}
              {loadingRegister && <ActivityIndicator color="#4A90E2" size="small" />}
            </Text>
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={openCamera}
              disabled={loadingRegister}
            >
              <Text style={styles.registerButtonText}>Register Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.profileContainer}>
            <TouchableOpacity 
              style={styles.imageContainer}
              onPress={openCamera}
              activeOpacity={0.8}
            >
              <Image
                style={styles.profileImage}
                source={{uri: currentImg ? currentImg.uri : defaultAva}}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Text style={styles.tapText}>Tap to scan</Text>
              </View>
            </TouchableOpacity>
            
            {!similarity ? (
              <Text style={styles.registeredText}>You're Registered. Tap the photo to recognize</Text>
            ) : (
              <View style={styles.resultContainer}>
                <Text
                  style={[
                    styles.resultText,
                    {color: similarity.includes('%') ? '#00c851' : '#ff4444'},
                  ]}>
                  {similarity}
                </Text>
              </View>
            )}
            
            {loadingMatch ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                  Recognizing <ActivityIndicator size="small" color="#4A90E2" />
                </Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.clearButton]}
                    onPress={() => clearResults()}
                  >
                    <Text style={styles.actionButtonText}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.logoutButton]}
                    onPress={() => clearResults(true)}
                  >
                    <Text style={styles.actionButtonText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        )}
        
        <TouchableOpacity
          style={styles.clearStorageButton}
          onPress={() => {
            clearResults(true);
            Alert.alert('Success', 'Storage cleared');
          }}
        >
          <Text style={styles.clearStorageText}>Clear Storage</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  // App styles
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    width: '100%',
    paddingVertical: 15,
    marginBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
  },
  registerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    maxWidth: 350,
  },
  registerText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#555555',
  },
  registerButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 2,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 350,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImage: {
    height: 180,
    width: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: '#4A90E2',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    borderBottomLeftRadius: 90,
    borderBottomRightRadius: 90,
    alignItems: 'center',
  },
  tapText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  registeredText: {
    fontSize: 16,
    color: '#555555',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultContainer: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#555555',
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#6c757d',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearStorageButton: {
    marginTop: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  clearStorageText: {
    color: '#6c757d',
    fontSize: 14,
  },
  
  // Camera Modal styles
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

export default App;
