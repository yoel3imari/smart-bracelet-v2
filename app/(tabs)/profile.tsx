import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bluetooth, Edit2, Save, X, LogOut } from 'lucide-react-native';
import { useHealthData } from '@/contexts/HealthDataContext';
import { useAuth } from '@/contexts/AuthContext';
import colors from '@/constants/colors';

type TabType = 'profile' | 'medical';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { userProfile, updateUserProfile } = useHealthData();
  const { user, signOut, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedProfile, setEditedProfile] = useState(userProfile);
  const [editedUser, setEditedUser] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
  });

  const handleSave = () => {
    // Update user profile data
    updateUserProfile(editedProfile);
    
    // Update user data (name and email)
    if (editedUser.name && editedUser.email) {
      updateUser({
        name: editedUser.name,
        email: editedUser.email,
      });
    }
    
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully');
  };

  const handleCancel = () => {
    setEditedProfile(userProfile);
    setEditedUser({
      name: user?.name || '',
      email: user?.email || '',
      password: '',
    });
    setIsEditing(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
            >
              {isEditing ? <Save size={20} color={colors.primary} /> : <Edit2 size={20} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
              <LogOut size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'medical' && styles.tabActive]}
            onPress={() => setActiveTab('medical')}
          >
            <Text style={[styles.tabText, activeTab === 'medical' && styles.tabTextActive]}>Medical Info</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'profile' ? (
          <View style={styles.content}>
            <View style={styles.profileCard}>
              <Text style={styles.name}>{user?.name || userProfile.name}</Text>
              <Text style={styles.email}>{user?.email}</Text>
            </View>

            {isEditing ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editedUser.name}
                    onChangeText={(text) => setEditedUser({ ...editedUser, name: text })}
                    placeholder="Enter your full name"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={editedUser.email}
                    onChangeText={(text) => setEditedUser({ ...editedUser, email: text })}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    value={editedUser.password}
                    onChangeText={(text) => setEditedUser({ ...editedUser, password: text })}
                    placeholder="Enter new password"
                    secureTextEntry
                  />
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Connected Devices</Text>
                <View style={styles.deviceCard}>
                  <View style={styles.deviceIcon}>
                    <Bluetooth size={24} color={colors.primary} />
                  </View>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>MedBand Pro X</Text>
                    <Text style={styles.deviceStatus}>Connected • Battery 87%</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              {isEditing ? (
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Age</Text>
                    <TextInput
                      style={styles.input}
                      value={editedProfile.age?.toString()}
                      onChangeText={(text) => setEditedProfile({ ...editedProfile, age: parseInt(text) || 0 })}
                      placeholder="Age"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>Gender</Text>
                    <TextInput
                      style={styles.input}
                      value={editedProfile.gender}
                      onChangeText={(text) => setEditedProfile({ ...editedProfile, gender: text })}
                      placeholder="Gender"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Age:</Text>
                    <Text style={styles.infoValue}>{userProfile.age} years</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Gender:</Text>
                    <Text style={styles.infoValue}>{userProfile.gender}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Blood Type</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedProfile.bloodType}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, bloodType: text })}
                  placeholder="Blood Type"
                />
              ) : (
                <View style={styles.infoCard}>
                  <Text style={styles.infoValue}>{userProfile.bloodType}</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Medical Conditions</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedProfile.conditions.join(', ')}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, conditions: text.split(',').map((s) => s.trim()) })
                  }
                  placeholder="Conditions (comma separated)"
                  multiline
                />
              ) : (
                <View style={styles.infoCard}>
                  {userProfile.conditions.map((condition, index) => (
                    <View key={index} style={styles.badge}>
                      <Text style={styles.badgeText}>{condition}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Allergies</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedProfile.allergies.join(', ')}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, allergies: text.split(',').map((s) => s.trim()) })
                  }
                  placeholder="Allergies (comma separated)"
                  multiline
                />
              ) : (
                <View style={styles.infoCard}>
                  {userProfile.allergies.map((allergy, index) => (
                    <View key={index} style={[styles.badge, styles.badgeDanger]}>
                      <Text style={[styles.badgeText, styles.badgeTextDanger]}>{allergy}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Medications</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedProfile.medications.join(', ')}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, medications: text.split(',').map((s) => s.trim()) })
                  }
                  placeholder="Medications (comma separated)"
                  multiline
                />
              ) : (
                <View style={styles.infoCard}>
                  {userProfile.medications.map((medication, index) => (
                    <Text key={index} style={styles.medicationText}>
                      • {medication}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {isEditing && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <X size={20} color={colors.danger} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
  },
  editButton: {
    padding: 8,
    backgroundColor: colors.white,
    borderRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: colors.white,
    borderRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.white,
  },
  content: {
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  info: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
  },
  deviceCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  deviceStatus: {
    fontSize: 12,
    color: colors.success,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  badgeDanger: {
    backgroundColor: '#FFEBEE',
  },
  badgeTextDanger: {
    color: colors.danger,
  },
  medicationText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.danger,
  },
});
