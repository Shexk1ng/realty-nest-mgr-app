// Zapytania, mutacje i typy GraphQL obsługujące oferty nieruchomości

import { gql } from "@apollo/client";

const PROPERTY_FIELDS = `
  id
  shortId
  title
  price
  location
  description
  descriptionSections { intro layout location additional }
  transactionType
  propertyType
  market
  status
  area
  plotArea
  rooms
  bedrooms
  bathrooms
  floor
  totalFloors
  yearBuilt
  pricePerM2
  monthlyRent
  deposit
  ownership
  condition
  heating
  energyClass
  availableFrom
  features
  address { street district city postalCode country lat lng }
  imageUrl
  images
  virtualTourUrl
  floorPlanUrl
  energyCertificateUrl
  agentId
  companyId
  propShareListed
  propShareListedAt
  propShareNotes
  contentApprovedAt
  createdAt
  ownerAgentName
  ownerAgentAvatarUrl
  updatedAt
`;

export const GET_PROPERTIES = gql`
  query GetProperties($companyId: String, $agentId: String, $status: String, $search: String, $limit: Int, $offset: Int) {
    getProperties(companyId: $companyId, agentId: $agentId, status: $status, search: $search, limit: $limit, offset: $offset) {
      items {
        ${PROPERTY_FIELDS}
      }
      totalCount
      hasMore
    }
  }
`;

export const GET_PROPERTY_BY_ID = gql`
  query GetPropertyById($id: ID!) {
    getPropertyById(id: $id) {
      ${PROPERTY_FIELDS}
    }
  }
`;

export const ADD_PROPERTY = gql`
  mutation AddProperty(
    $title: String!
    $price: Float!
    $location: String!
    $description: String
    $descriptionSections: PropertyDescriptionSectionsInput
    $transactionType: String
    $propertyType: String
    $market: String
    $status: String
    $area: Float
    $plotArea: Float
    $rooms: Int
    $bedrooms: Int
    $bathrooms: Int
    $floor: Int
    $totalFloors: Int
    $yearBuilt: Int
    $monthlyRent: Float
    $deposit: Float
    $ownership: String
    $condition: String
    $heating: String
    $energyClass: String
    $availableFrom: String
    $features: [String!]
    $address: PropertyAddressInput
    $imageUrl: String
    $images: [String!]
    $agentId: String
  ) {
    addProperty(
      title: $title
      price: $price
      location: $location
      description: $description
      descriptionSections: $descriptionSections
      transactionType: $transactionType
      propertyType: $propertyType
      market: $market
      status: $status
      area: $area
      plotArea: $plotArea
      rooms: $rooms
      bedrooms: $bedrooms
      bathrooms: $bathrooms
      floor: $floor
      totalFloors: $totalFloors
      yearBuilt: $yearBuilt
      monthlyRent: $monthlyRent
      deposit: $deposit
      ownership: $ownership
      condition: $condition
      heating: $heating
      energyClass: $energyClass
      availableFrom: $availableFrom
      features: $features
      address: $address
      imageUrl: $imageUrl
      images: $images
      agentId: $agentId
    ) {
      ${PROPERTY_FIELDS}
    }
  }
`;

export const UPDATE_PROPERTY = gql`
  mutation UpdateProperty(
    $id: ID!
    $title: String
    $price: Float
    $location: String
    $description: String
    $descriptionSections: PropertyDescriptionSectionsInput
    $transactionType: String
    $propertyType: String
    $market: String
    $status: String
    $area: Float
    $plotArea: Float
    $rooms: Int
    $bedrooms: Int
    $bathrooms: Int
    $floor: Int
    $totalFloors: Int
    $yearBuilt: Int
    $monthlyRent: Float
    $deposit: Float
    $ownership: String
    $condition: String
    $heating: String
    $energyClass: String
    $availableFrom: String
    $features: [String!]
    $address: PropertyAddressInput
    $imageUrl: String
    $images: [String!]
    $agentId: String
  ) {
    updateProperty(
      id: $id
      title: $title
      price: $price
      location: $location
      description: $description
      descriptionSections: $descriptionSections
      transactionType: $transactionType
      propertyType: $propertyType
      market: $market
      status: $status
      area: $area
      plotArea: $plotArea
      rooms: $rooms
      bedrooms: $bedrooms
      bathrooms: $bathrooms
      floor: $floor
      totalFloors: $totalFloors
      yearBuilt: $yearBuilt
      monthlyRent: $monthlyRent
      deposit: $deposit
      ownership: $ownership
      condition: $condition
      heating: $heating
      energyClass: $energyClass
      availableFrom: $availableFrom
      features: $features
      address: $address
      imageUrl: $imageUrl
      images: $images
      agentId: $agentId
    ) {
      ${PROPERTY_FIELDS}
    }
  }
`;

export const DELETE_PROPERTY = gql`
  mutation DeleteProperty($id: ID!) {
    deleteProperty(id: $id)
  }
`;

export type TransactionType = "SALE" | "RENT";
export type PropertyType =
  | "APARTMENT" | "HOUSE" | "STUDIO" | "PLOT" | "COMMERCIAL" | "OFFICE" | "GARAGE" | "ROOM";
export type MarketType = "PRIMARY" | "SECONDARY";
export type PropertyStatus = "ACTIVE" | "PENDING" | "SOLD" | "WITHDRAWN";
export type OwnershipType = "FULL_OWNERSHIP" | "COOPERATIVE" | "COOPERATIVE_LAND" | "SHARE";
export type PropertyCondition =
  | "READY_TO_MOVE" | "GOOD" | "AFTER_RENOVATION" | "TO_RENOVATE" | "FOR_FINISHING" | "DEVELOPER_STATE";

export interface PropertyAddress {
  street?: string | null;
  district?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface PropertyDescriptionSections {
  intro?: string | null;
  layout?: string | null;
  location?: string | null;
  additional?: string | null;
}

export interface Property {
  id: string;
  shortId: number;
  title: string;
  price: number;
  location: string;
  description?: string | null;
  descriptionSections?: PropertyDescriptionSections | null;
  transactionType?: TransactionType | null;
  propertyType?: PropertyType | null;
  market?: MarketType | null;
  status: PropertyStatus;
  area?: number | null;
  plotArea?: number | null;
  rooms?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  yearBuilt?: number | null;
  pricePerM2?: number | null;
  monthlyRent?: number | null;
  deposit?: number | null;
  ownership?: OwnershipType | null;
  condition?: PropertyCondition | null;
  heating?: string | null;
  energyClass?: string | null;
  availableFrom?: string | null;
  features?: string[] | null;
  address?: PropertyAddress | null;
  imageUrl?: string | null;
  images?: string[] | null;
  virtualTourUrl?: string | null;
  floorPlanUrl?: string | null;
  energyCertificateUrl?: string | null;
  agentId?: string | null;
  companyId?: string | null;
  propShareListed?: boolean | null;
  propShareListedAt?: string | null;
  propShareNotes?: string | null;
  contentApprovedAt?: string | null;
  createdAt?: string | null;
  ownerAgentName?: string | null;
  ownerAgentAvatarUrl?: string | null;
  updatedAt?: string | null;
}
