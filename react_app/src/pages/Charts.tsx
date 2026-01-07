import { PageWrapper } from "@components/page-wrapper";
import { AGChartsHelix } from "@helix/ag-charts";
import { useState } from "react";
const chartOptions = [
  {
    label: "Chart 1",
  },
  {
    label: "Chart 2",
  },
  { label: "Chart 3" },
];

function Charts() {
  const [chartOptionsData] = useState({
    title: {
      text: "Current Opportunities",
    },
    data: [
      {
        label: "New",
        value: 10,
      },
      {
        label: "Qualified",
        value: 5,
      },
      {
        label: "Nurture",
        value: 3,
      },
      {
        label: "Cold",
        value: 2,
      },
      {
        label: "Searching",
        value: 1,
      },
      {
        label: "Pre-list",
        value: 8,
      },
      {
        label: "Active",
        value: 6,
      },
      {
        label: "Contract",
        value: 4,
      },
      {
        label: "Closed",
        value: 7,
      },
    ],
    series: [
      {
        type: "bar",
        xKey: "label",
        yKey: "value",
      },
    ],
    axes: [
      {
        position: "left",
        type: "number",
        label: {
          enabled: true,
          format: "0",
        },
        title: {
          enabled: true,
        },
      },
      {
        position: "bottom",
        type: "category",
        label: {
          enabled: true,
        },
      },
    ],
  });
  return (
    <PageWrapper>
      <div
        className='helix-d-flex helix-flex-direction--column helix-gap-4 helix-pt-5 helix-px-6'
        style={{ height: "calc(100dvh - 68px)", overflow: "auto" }}
      >
        <h1>Charts Page</h1>
        <p>Choose a chart that you would like to view</p>
        <div className='helix-d-flex helix-gap-2 helix-align--self--center helix-mt-4'>
          {chartOptions.map((chart) => {
            return (
              <div className='helix-card helix-w-300'>
                <div className='helix-card__body'>{chart.label}</div>
              </div>
            );
          })}
        </div>
        <div className='helix-card'>
          <div className='helix-card__body'>
            <AGChartsHelix options={chartOptionsData} />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default Charts;
