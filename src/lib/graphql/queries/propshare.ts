// Zapytania, mutacje i typy GraphQL obsługujące wymianę ofert i kolejkę przydziału PropShare

import { gql } from "@apollo/client";

export interface PropShareOffer {
  id: string;
  shortId: number;
  propertyId: string;
  property?: PropShareProperty;
  fromAgentId: string;
  fromCompanyId: string;
  toAgentId: string;
  toCompanyId: string;
  enquiryId: string | null;
  status: "PENDING" | "VIEWED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  message: string | null;
  proposedCommission: number | null;
  fromAgentName: string | null;
  fromAgentAvatarUrl: string | null;
  fromCompanyName: string | null;
  toAgentName: string | null;
  toAgentAvatarUrl: string | null;
  toCompanyName: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PropShareProperty {
  id: string;
  title: string;
  status: string;
  price: number | null;
  location: string | null;
  area: number | null;
  rooms: number | null;
  transactionType: string | null;
  propertyType: string | null;
  imageUrl: string | null;
  images: string[];
  description: string | null;
  propShareListed: boolean;
  propShareListedAt: string | null;
  propShareNotes: string | null;
  companyId: string | null;
  agentId: string | null;
  condition: string | null;
  floor: number | null;
  totalFloors: number | null;
  yearBuilt: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  features: string[];
  address?: {
    city: string | null;
    district: string | null;
    lat: number | null;
    lng: number | null;
    street: string | null;
  } | null;
  ownerCompanyName: string | null;
  ownerCompanyLogoUrl: string | null;
  ownerAgentName: string | null;
  ownerAgentAvatarUrl: string | null;
}

export interface AllocationAgent {
  agentId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  allocationEnabled: boolean;
  allocationQueueOrder: number | null;
  lastAllocatedAt: string | null;
}

const PROP_SHARE_PROPERTY_FIELDS = `
  id title status price location area rooms transactionType propertyType
  imageUrl images description propShareListed propShareListedAt propShareNotes
  companyId agentId condition floor totalFloors yearBuilt bedrooms bathrooms features
  address { city district lat lng street }
  ownerCompanyName ownerCompanyLogoUrl ownerAgentName ownerAgentAvatarUrl
`;

export const GET_PROPSHARE_LISTINGS = gql`
  query GetPropShareListings {
    getPropShareListings {
      ${PROP_SHARE_PROPERTY_FIELDS}
    }
  }
`;

export const GET_PROPSHARE_OFFERS = gql`
  query GetPropShareOffers {
    getPropShareOffers {
      id shortId propertyId property {
        ${PROP_SHARE_PROPERTY_FIELDS}
      }
      fromAgentId fromCompanyId toAgentId toCompanyId enquiryId
      fromAgentName fromAgentAvatarUrl fromCompanyName
      toAgentName toAgentAvatarUrl toCompanyName
      status message proposedCommission viewedAt respondedAt createdAt updatedAt
    }
  }
`;

export const GET_ALLOCATION_QUEUE = gql`
  query GetAllocationQueue {
    getAllocationQueue {
      agentId name avatarUrl role allocationEnabled allocationQueueOrder lastAllocatedAt
    }
  }
`;

export const GET_PROPSHARE_OFFER_COUNT = gql`
  query GetPropShareOfferCount($id: ID!) {
    getPropertyById(id: $id) {
      id
      propShareOfferCount
    }
  }
`;

export const TOGGLE_PROPSHARE = gql`
  mutation TogglePropShare($propertyId: ID!, $listed: Boolean!, $notes: String) {
    togglePropShare(propertyId: $propertyId, listed: $listed, notes: $notes) {
      id propShareListed propShareListedAt propShareNotes
    }
  }
`;

export const SEND_PROPSHARE_OFFER = gql`
  mutation SendPropShareOffer(
    $propertyId: ID!, $enquiryId: ID, $message: String, $proposedCommission: Float
  ) {
    sendPropShareOffer(
      propertyId: $propertyId, enquiryId: $enquiryId,
      message: $message, proposedCommission: $proposedCommission
    ) {
      id shortId status createdAt
    }
  }
`;

export const UPDATE_PROPSHARE_OFFER = gql`
  mutation UpdatePropShareOffer($offerId: ID!, $status: String!) {
    updatePropShareOffer(offerId: $offerId, status: $status) {
      id status viewedAt respondedAt updatedAt
    }
  }
`;

export const UPDATE_ALLOCATION_SETTINGS = gql`
  mutation UpdateAllocationSettings($agentId: ID!, $enabled: Boolean, $queueOrder: Int) {
    updateAllocationSettings(agentId: $agentId, enabled: $enabled, queueOrder: $queueOrder)
  }
`;

export interface EnquiryBrief {
  budget: number | null;
  location: string | null;
  propertyInterest: string | null;
}

export function scoreMatch(property: PropShareProperty, enquiry: EnquiryBrief): number {
  let score = 0;
  if (enquiry.budget && enquiry.budget > 0 && property.price != null) {
    if (property.price <= enquiry.budget) score += 40;
  }
  if (enquiry.location?.trim()) {
    const loc = enquiry.location.toLowerCase();
    const pLoc = (property.location ?? "").toLowerCase();
    const pCity = (property.address?.city ?? "").toLowerCase();
    const pDistrict = (property.address?.district ?? "").toLowerCase();
    if (pLoc.includes(loc) || loc.includes(pLoc) || pCity.includes(loc) || pDistrict.includes(loc)) {
      score += 30;
    }
  }
  if (enquiry.propertyInterest?.trim()) {
    const interest = enquiry.propertyInterest.toLowerCase();
    const pType = (property.propertyType ?? "").toLowerCase();
    const pTitle = (property.title ?? "").toLowerCase();
    if (interest.includes(pType) || pType.includes(interest) || pTitle.includes(interest)) {
      score += 30;
    }
  }
  return score;
}
