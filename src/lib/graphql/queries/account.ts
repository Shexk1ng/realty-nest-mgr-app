// Zapytania i mutacje GraphQL dotyczące własnego profilu, zmiany hasła i konfiguracji 2FA

import { gql } from "@apollo/client";

const PROFILE_FIELDS = `
  firstName lastName fullName phone phoneMobile avatarUrl profilePictureUrl bio jobTitle licenseNumber timezone language
`;

const USER_FIELDS = `
  id shortId email name role companyId isActive twoFactorEnabled createdAt
  profile { ${PROFILE_FIELDS} }
  company { id name logoUrl coverImageUrl }
`;

export const ME = gql`
  query Me { me { ${USER_FIELDS} } }
`;

export const TWO_FACTOR_STATUS = gql`
  query TwoFactorStatus { twoFactorStatus { enabled enabledAt } }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($id: ID!, $profile: UserProfileInput!) {
    updateProfile(id: $id, profile: $profile) { ${USER_FIELDS} }
  }
`;

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($id: ID!, $currentPassword: String!, $newPassword: String!) {
    changePassword(id: $id, currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

export const INIT_TWO_FACTOR = gql`
  mutation InitTwoFactor {
    initTwoFactor { qrCodeDataUrl backupCodes }
  }
`;

export const CONFIRM_TWO_FACTOR = gql`
  mutation ConfirmTwoFactor($code: String!) {
    confirmTwoFactor(code: $code) { enabled enabledAt }
  }
`;

export const DISABLE_TWO_FACTOR = gql`
  mutation DisableTwoFactor($reason: String) {
    disableTwoFactor(reason: $reason) { enabled enabledAt }
  }
`;

export interface UserProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  phoneMobile: string | null;
  avatarUrl: string | null;
  profilePictureUrl: string | null;
  bio: string | null;
  jobTitle: string | null;
  licenseNumber: string | null;
  timezone: string;
  language: string;
}

export interface CompanyBrief {
  id: string;
  name: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
}

export interface MeUser {
  id: string;
  shortId: number;
  email: string;
  name: string;
  role: string;
  companyId: string | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: string | null;
  profile: UserProfile;
  company: CompanyBrief | null;
}

export interface ProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  phoneMobile?: string | null;
  avatarUrl?: string | null;
  profilePictureUrl?: string | null;
  bio?: string | null;
  jobTitle?: string | null;
  licenseNumber?: string | null;
}

export interface TwoFactorSetupPayload {
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  enabledAt: string | null;
}
