import { Fragment } from "react";
import { dutyCellInfo, dutyDateClass } from "../../lib/calendar";
import { printConfig } from "../../lib/print-config";

/**
 * 당직표 및 조기퇴근표 PDF 출력(프린트)을 위한 레이아웃 컴포넌트입니다.
 */
export default function PrintSheet({ weeks, earlyLeave, title }) {
  const workdayWeeks = weeks.filter((week) => week.slice(0, 5).some(Boolean));

  return (
    <div className="print-sheet duty-print-sheet" aria-hidden="true">
      <h1 className="print-title">{title}</h1>

      <h2 className="print-section">&lt; 당 직 &gt;</h2>
      <table className="print-table duty-table">
        <tbody>
          {weeks.map((week, weekIndex) => {
            const cells = week.map(dutyCellInfo);
            return (
              <Fragment key={`week-${weekIndex}`}>
                <tr className="duty-date-row">
                  <th>날짜</th>
                  {cells.map((cell, cellIndex) => (
                    <td className={dutyDateClass(cell)} key={`d-${cellIndex}`}>
                      {cell.day ?? ""}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>오전1/오전2</th>
                  {cells.map((cell, cellIndex) => {
                    if (cell.type === "duty")
                      return <td key={`m-${cellIndex}`}>{cell.morning}</td>;
                    if (cell.type === "holiday")
                      return (
                        <td className="holiday-cell" rowSpan={2} key={`m-${cellIndex}`}>
                          {cell.holidayName}
                        </td>
                      );
                    if (cell.type === "dash")
                      return (
                        <td rowSpan={2} key={`m-${cellIndex}`}>
                          –
                        </td>
                      );
                    return <td rowSpan={2} key={`m-${cellIndex}`} />;
                  })}
                </tr>
                <tr>
                  <th>오후</th>
                  {cells.map((cell, cellIndex) =>
                    cell.type === "duty" ? (
                      <td key={`a-${cellIndex}`}>{cell.afternoon}</td>
                    ) : null,
                  )}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <table className="print-table legend-table">
        <tbody>
          <tr>
            <th>표기법</th>
            {printConfig.dutyHours.map((item) => (
              <td key={item.label}>{item.label}</td>
            ))}
          </tr>
          <tr>
            <th>당직시간</th>
            {printConfig.dutyHours.map((item) => (
              <td key={item.label}>{item.time}</td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="print-note">{printConfig.dutyNote}</p>

      <h2 className="print-section">&lt; 조기퇴근 &gt;</h2>
      <table className="print-table early-table">
        <thead>
          <tr>
            {["월", "화", "수", "목", "금"].map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {workdayWeeks.map((week, weekIndex) => (
            <tr key={`early-${weekIndex}`}>
              {week.slice(0, 5).map((day, cellIndex) => (
                <td key={`e-${cellIndex}`}>
                  {day ? (
                    <div className="early-cell">
                      <span className="early-date">{day.day}/</span>
                      {day.holidayName ? (
                        <span className="early-holiday">{day.holidayName}</span>
                      ) : (
                        (earlyLeave[day.key] || []).map(([name, hours], index) => (
                          <span key={`${day.key}-${index}`}>
                            {name}({hours})
                          </span>
                        ))
                      )}
                    </div>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <table className="print-table legend-table">
        <tbody>
          <tr>
            <th>표기법</th>
            {printConfig.earlyLegend.map((item) => (
              <td key={item.label}>{item.label}</td>
            ))}
          </tr>
          <tr>
            <th>퇴근시간</th>
            {printConfig.earlyLegend.map((item) => (
              <td key={item.label}>{item.time}</td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="print-note">{printConfig.earlyNote}</p>

      <table className="print-table viewers-table">
        <tbody>
          <tr>
            <th className="viewers-label" rowSpan={2}>
              공람
            </th>
            {printConfig.viewers.map((group) => (
              <th key={group.group} colSpan={group.members.length}>
                {group.group}
              </th>
            ))}
          </tr>
          <tr>
            {printConfig.viewers.flatMap((group) =>
              group.members.map((member, memberIndex) => (
                <td key={`${group.group}-${memberIndex}`}>{member}</td>
              )),
            )}
          </tr>
          <tr className="viewers-sign">
            <th>&nbsp;</th>
            {printConfig.viewers.flatMap((group) =>
              group.members.map((_, memberIndex) => (
                <td key={`sign-${group.group}-${memberIndex}`} />
              )),
            )}
          </tr>
        </tbody>
      </table>

      <p className="print-footer">
        <span>{printConfig.footerNote}</span>
        <span>{printConfig.org}</span>
      </p>
    </div>
  );
}
