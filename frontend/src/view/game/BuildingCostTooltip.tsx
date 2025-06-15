// frontend/src/view/game/BuildingCostTooltip.tsx
import React from "react";
import styled from "styled-components";

interface BuildingCostTooltipProps {
  buildingType: "settlement" | "city" | "road" | "dev_card";
  isVisible: boolean;
  myResources: Record<string, number>;
  position?: { x: number; y: number };
}

const TooltipContainer = styled.div<{ isVisible: boolean; x?: number; y?: number }>`
  position: fixed;
  top: ${props => props.y ? `${props.y}px` : '50%'};
  left: ${props => props.x ? `${props.x}px` : '50%'};
  transform: translate(-50%, -100%);
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 250px;
  opacity: ${props => props.isVisible ? 1 : 0};
  pointer-events: none;
  transition: all 0.2s ease;
  transform-origin: bottom center;
  
  ${props => !props.isVisible && `
    transform: translate(-50%, -100%) scale(0.9);
  `}

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid #3b82f6;
  }
`;

const TooltipHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const BuildingIcon = styled.div`
  font-size: 20px;
`;

const BuildingName = styled.h4`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
`;

const CostSection = styled.div`
  margin-bottom: 8px;
`;

const CostLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const ResourceList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
`;

const ResourceItem = styled.div<{ canAfford: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid ${props => props.canAfford ? '#bbf7d0' : '#fecaca'};
  background: ${props => props.canAfford ? '#f0fdf4' : '#fef2f2'};
  transition: all 0.2s;
`;

const ResourceIcon = styled.div`
  font-size: 16px;
  margin-bottom: 4px;
`;

const ResourceCost = styled.div<{ canAfford: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${props => props.canAfford ? '#059669' : '#dc2626'};
  margin-bottom: 2px;
`;

const ResourceName = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
`;

const ResourceBalance = styled.div<{ canAfford: boolean }>`
  font-size: 10px;
  color: ${props => props.canAfford ? '#059669' : '#dc2626'};
  margin-top: 2px;
`;

const SummarySection = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
`;

const CanAffordBadge = styled.div<{ canAfford: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.canAfford ? '#bbf7d0' : '#fecaca'};
  color: ${props => props.canAfford ? '#059669' : '#dc2626'};
  border: 1px solid ${props => props.canAfford ? '#16a34a' : '#ef4444'};
`;

const BenefitsList = styled.div`
  margin-top: 8px;
`;

const BenefitItem = styled.div`
  font-size: 11px;
  color: #475569;
  margin-bottom: 2px;
  
  &::before {
    content: '• ';
    color: #3b82f6;
    font-weight: bold;
  }
`;

export default function BuildingCostTooltip({
  buildingType,
  isVisible,
  myResources,
  position
}: BuildingCostTooltipProps) {
  const resourceIcons: Record<string, string> = {
    wood: "🌲",
    brick: "🧱", 
    sheep: "🐑",
    wheat: "🌾",
    ore: "⛰️",
  };

  const buildingData = {
    settlement: {
      icon: "🏠",
      name: "Settlement",
      costs: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
      benefits: [
        "Gives 1 Victory Point",
        "Produces resources when dice rolled",
        "Can be upgraded to City"
      ]
    },
    city: {
      icon: "🏰", 
      name: "City",
      costs: { ore: 3, wheat: 2 },
      benefits: [
        "Gives 2 Victory Points", 
        "Produces 2x resources when dice rolled",
        "Replaces existing Settlement"
      ]
    },
    road: {
      icon: "🛣️",
      name: "Road", 
      costs: { wood: 1, brick: 1 },
      benefits: [
        "Connects Settlements and Cities",
        "Enables building in new locations",
        "Counts toward Longest Road bonus"
      ]
    },
    dev_card: {
      icon: "🃏",
      name: "Development Card",
      costs: { sheep: 1, wheat: 1, ore: 1 },
      benefits: [
        "Knight, Progress, or Victory Point card",
        "Can provide special abilities",
        "Victory Point cards give 1 VP each"
      ]
    }
  };

  const building = buildingData[buildingType];
  
  const canAffordBuilding = Object.entries(building.costs).every(
    ([resource, cost]) => (myResources[resource] || 0) >= cost
  );

  const getTotalResourcesNeeded = () => {
    return Object.values(building.costs).reduce((a, b) => a + b, 0);
  };

  const getTotalResourcesHave = () => {
    return Object.entries(building.costs).reduce((total, [resource, needed]) => {
      return total + Math.min(myResources[resource] || 0, needed);
    }, 0);
  };

  if (!isVisible) return null;

  return (
    <TooltipContainer 
      isVisible={isVisible} 
      x={position?.x} 
      y={position?.y}
    >
      <TooltipHeader>
        <BuildingIcon>{building.icon}</BuildingIcon>
        <BuildingName>{building.name}</BuildingName>
      </TooltipHeader>

      <CostSection>
        <CostLabel>Required Resources:</CostLabel>
        <ResourceList>
          {Object.entries(building.costs).map(([resource, cost]) => {
            const have = myResources[resource] || 0;
            const canAfford = have >= cost;

            return (
              <ResourceItem key={resource} canAfford={canAfford}>
                <ResourceIcon>{resourceIcons[resource]}</ResourceIcon>
                <ResourceCost canAfford={canAfford}>{cost}</ResourceCost>
                <ResourceName>{resource}</ResourceName>
                <ResourceBalance canAfford={canAfford}>
                  Have: {have}
                </ResourceBalance>
              </ResourceItem>
            );
          })}
        </ResourceList>
      </CostSection>

      <SummarySection>
        <CanAffordBadge canAfford={canAffordBuilding}>
          {canAffordBuilding ? "✅ Can Build" : "❌ Need More Resources"}
          <span style={{ fontSize: "10px", opacity: 0.8 }}>
            ({getTotalResourcesHave()}/{getTotalResourcesNeeded()})
          </span>
        </CanAffordBadge>

        <BenefitsList>
          {building.benefits.map((benefit, index) => (
            <BenefitItem key={index}>{benefit}</BenefitItem>
          ))}
        </BenefitsList>
      </SummarySection>
    </TooltipContainer>
  );
}