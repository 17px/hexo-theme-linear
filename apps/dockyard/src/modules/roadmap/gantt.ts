import "./gantt.less";
import dayjs from "dayjs";

export interface GanttTask {
  name: string;
  start: string;
  end: string;
}

export class Gantt {
  currentYear: number;
  chartContainer: HTMLElement;
  taskList: GanttTask[];
  isUserDragging: boolean = false;
  lastMouseX: number = 0;
  currentDayWidth: number = 30;

  constructor(year: number, containerSelector: string, tasks: GanttTask[]) {
    this.currentYear = year;
    this.taskList = tasks;
    this.chartContainer = document.querySelector(
      containerSelector
    ) as HTMLElement;

    if (!this.chartContainer) {
      throw new Error(`Container with selector ${containerSelector} not found`);
    }

    this.renderChart();
    this.handleMouseWheelInView();
    this.centerOnCurrentDay();
    this.updateDayWidthOnScroll();
  }

  private getDaysOfMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  private handleMouseDown = (e: MouseEvent) => {
    this.isUserDragging = true;
    this.lastMouseX = e.clientX;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isUserDragging) {
      const dx = e.clientX - this.lastMouseX;
      this.chartContainer.scrollBy(-dx, 0);
      this.lastMouseX = e.clientX;
    }
  };

  private handleMouseUp = () => {
    this.isUserDragging = false;
  };

  private renderChart(): void {
    this.chartContainer.innerHTML = "";

    const timelineDiv = document.createElement("div");
    timelineDiv.className = "timeline-container";

    const taskDiv = document.createElement("div");
    taskDiv.className = "task-container";

    // 绑定拖拽事件
    this.chartContainer.addEventListener("mousedown", this.handleMouseDown);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);

    // 创建月份行
    const monthsRow = document.createElement("div");
    monthsRow.className = "months-row";

    // 创建天数行
    const daysRow = document.createElement("div");
    daysRow.className = "days-row";

    let currentLeft = 0;

    for (let month = 0; month < 12; month++) {
      // 月份显示
      const monthDiv = document.createElement("div");
      monthDiv.className = "month";
      monthDiv.textContent = `${this.currentYear}年${month + 1}月`;
      monthDiv.style.left = `${currentLeft}px`;
      monthsRow.appendChild(monthDiv);

      // 天数显示
      const daysInMonth = this.getDaysOfMonth(this.currentYear, month);
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const currentDay = currentDate.getDate();

      // 创建竖线
      const verticalLine = document.createElement("div");
      verticalLine.style.position = "absolute";
      verticalLine.style.height = "100%"; // 你可以根据需要调整高度
      verticalLine.style.width = "0"; // 设置宽度为0，因为我们将使用border来显示线
      verticalLine.style.borderLeft = "1px dashed var(--color-border-2)"; // 使用虚线
      verticalLine.style.left = `${currentLeft}px`; // 与 .month 的 left 值相同

      // 将竖线添加到 taskContainer 中
      taskDiv.appendChild(verticalLine);

      for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement("div");
        dayDiv.className = "day";
        const ymd = `${this.currentYear}-${
          month + 1 > 9 ? month + 1 : "0" + (month + 1)
        }-${day > 9 ? day : "0" + day}`;
        dayDiv.setAttribute("data-ymd", String(ymd));
        dayDiv.textContent = `${day}`;
        dayDiv.style.position = "absolute";
        dayDiv.style.left = `${currentLeft}px`;

        // 检查今天的日期，并添加标识
        if (
          this.currentYear === currentYear &&
          month === currentMonth &&
          day === currentDay
        ) {
          dayDiv.classList.add("today");
        }

        daysRow.appendChild(dayDiv);
        currentLeft += this.currentDayWidth;
      }
    }

    // 将月份和天数行添加到主容器
    timelineDiv.appendChild(monthsRow);
    timelineDiv.appendChild(daysRow);

    this.taskList.forEach((task, index) => {
      const taskEl = document.createElement("div");
      taskEl.className = "task-bar";
      taskEl.setAttribute("data-start", dayjs(task.start).format("YYYY-MM-DD"));
      taskEl.setAttribute("data-end", dayjs(task.end).format("YYYY-MM-DD"));
      taskEl.style.position = "absolute";
      taskEl.style.height = "30px";
      taskEl.style.lineHeight = "30px";
      taskEl.style.top = index * 30 + "px";
      taskEl.textContent = task.name;
      taskDiv.appendChild(taskEl);
    });

    this.chartContainer.appendChild(timelineDiv);
    this.chartContainer.appendChild(taskDiv);

    this.updateTaskBars();
  }
  /**
   * 当天聚焦到屏幕中心
   */
  centerOnCurrentDay() {
    // 获取当前日期
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();

    // 如果当前年份是这个 Gantt 图的年份
    if (this.currentYear === currentYear) {
      // 计算当前日期距离年初的天数
      let daysFromStartOfYear = 0;
      for (let i = 0; i < currentMonth; i++) {
        daysFromStartOfYear += this.getDaysOfMonth(currentYear, i);
      }
      daysFromStartOfYear += currentDay;

      // 计算这些天数对应的像素值
      const currentLeftPosition = daysFromStartOfYear * this.currentDayWidth;

      // 计算要滚动的像素量以便将当前日期居中
      const halfContainerWidth = this.chartContainer.offsetWidth / 2;
      const scrollToPosition = currentLeftPosition - halfContainerWidth;

      // 执行滚动
      this.chartContainer.scrollLeft = scrollToPosition;
    }
  }

  /**
   * 根据滚动方向更新dayWidth
   */
  handleMouseWheelInView(): void {
    this.chartContainer.addEventListener("wheel", (e: WheelEvent) => {
      this.currentDayWidth *= e.deltaY > 0 ? 0.9 : 1.1;
      this.renderChart();
      // this.todayFocusCenter();
      this.updateDayWidthOnScroll();
      this.updateTaskBars();
    });
  }

  updateDayWidthOnScroll(): void {
    const dayElements = [
      ...this.chartContainer.querySelectorAll(".day"),
    ] as HTMLElement[];

    if (this.currentDayWidth < 25) {
      dayElements.forEach((day, index) => {
        // 每隔7天显示一次
        if (index % 8 === 0) {
          day.style.display = "block";
        } else {
          day.style.display = "none";
        }
      });
    } else {
      // 如果 this.dayWidth 大于或等于 25，显示所有日期
      dayElements.forEach((day) => {
        day.style.display = "block";
      });
    }

    // 由于.day的可见性发生了变化，因此需要更新任务条
    this.updateTaskBars();
  }

  /**
   * 更新task的位置
   */
  updateTaskBars(): void {
    const taskBars = [
      ...this.chartContainer.querySelectorAll(".task-bar"),
    ] as HTMLElement[];

    taskBars.forEach((taskBar) => {
      const start = taskBar.getAttribute("data-start")!;
      const end = taskBar.getAttribute("data-end")!;

      // 找到对应的 .day 元素的 left 值
      const startDay = this.chartContainer.querySelector(
        `.day[data-ymd="${start}"]`
      ) as HTMLDivElement;
      const endDay = this.chartContainer.querySelector(
        `.day[data-ymd="${dayjs(end).add(1, "day").format("YYYY-MM-DD")}"]`
      ) as HTMLDListElement;

      if (startDay && endDay) {
        const leftOffset = parseInt(startDay.style.left, 10);
        const width = parseInt(endDay.style.left, 10) - leftOffset;

        taskBar.style.left = `${leftOffset}px`;
        taskBar.style.width = `${width}px`;
      }
    });
  }
}
