# MONSOON-GUARD: Operational Label Definitions

This document details the exact, reproducible mathematical definitions used to construct ground-truth target labels for the MONSOON-GUARD probabilistic forecasting models.

---

## 1. Distinction from IMD Kerala Synoptic Onset

The **India Meteorological Department (IMD)** officially declares Monsoon Onset over Kerala (MOK) based on large-scale synoptic conditions:
1. Rainfall: 60% of 14 designated stations in Kerala and Lakshadweep recording $\ge 2.5\text{ mm}$ rain for 2 consecutive days after May 10.
2. Wind field: Depth of westerlies up to $600\text{ hPa}$ in the box Eq–$10^\circ\text{N}$, $55^\circ\text{E}$–$80^\circ\text{E}$, and zonal wind speed $\ge 15\text{ knots}$ at $925\text{ hPa}$.
3. Outgoing Longwave Radiation (OLR): INSAT derived OLR $< 200\text{ W/m}^2$ in the box $5^\circ\text{N}$–$10^\circ\text{N}$, $70^\circ\text{E}$–$75^\circ\text{E}$.

**Why MOK is insufficient for local farmers:**
MOK indicates monsoon arrival at the southwest tip of the Indian subcontinent. Central Indian rainfed farmers (e.g., in Chhattisgarh / MP) require **Local Agro-Meteorological Onset**—the arrival of sustained, crop-viable soil-wetting rainfall at their specific Block/Panchayat, which typically occurs 10 to 25 days after MOK and is vulnerable to synoptic stalls or hiatuses.

---

## 2. Local Monsoon Onset Definition (Block Scale)

Let $R(t)$ denote the daily rainfall (in mm) at a given block coordinate on calendar day $t$.
A day $t$ is defined as an **IMD Rain Day** if:
$$\text{RainDay}(t) = \mathbb{I}(R(t) \ge 2.5\text{ mm})$$

### 2.1 Onset Eligibility Window
The candidate search window opens on **June 1** ($t_{\text{start}} = \text{DOY } 152$ or $153$ in leap year) and closes on **July 15** ($t_{\text{end}} = \text{DOY } 196$ or $197$).

### 2.2 Operational Criteria for Onset Date ($T_{\text{onset}}$)
A candidate date $t_0$ is marked as the **Local Onset Date** $T_{\text{onset}}$ if:
1. **Initial Burst**: Cumulative rainfall over 3 days satisfies:
   $$\sum_{\tau=0}^{2} R(t_0 + \tau) \ge 25.0\text{ mm}$$
2. **Precipitation Distribution**: At least 2 of the 3 days $[t_0, t_0 + 2]$ are rain days:
   $$\sum_{\tau=0}^{2} \text{RainDay}(t_0 + \tau) \ge 2$$
3. **Sustained Verification (Anti-False-Onset Condition)**: In the subsequent 10 days $[t_0 + 3, t_0 + 12]$:
   - The maximum consecutive dry spell (days where $R(t) < 2.5\text{ mm}$) does not exceed 6 consecutive days:
     $$\max \text{ConsecutiveDryDays}(t_0 + 3, t_0 + 12) \le 6$$
   - Cumulative rainfall over this 10-day verification window satisfies:
     $$\sum_{\tau=3}^{12} R(t_0 + \tau) \ge 30.0\text{ mm}$$

If $t_0$ meets criteria (1) and (2) but fails criterion (3), it is classified as a **False Onset Episode** (see Section 3).

### 2.3 Binary Target Label for Lead Horizon $H \in \{7, 14, 21, 30\}$ Days
At forecast issue date $t$:
$$Y_{\text{onset}, H}(t) = \begin{cases}
1, & \text{if verified } T_{\text{onset}} \in [t + 1, t + H] \\
0, & \text{otherwise}
\end{cases}$$
If onset has already occurred prior to $t$ in that calendar year, $Y_{\text{onset}, H}(t)$ is masked/not-applicable.

---

## 3. False Onset Definition (Critical Hindcast Label)

An event is flagged as a **False Onset** on date $t_0$ if:
1. Rainfall burst occurs: $\sum_{\tau=0}^{2} R(t_0 + \tau) \ge 25.0\text{ mm}$ with $\ge 2$ rain days.
2. An immediate severe dry spell follows: $\max \text{ConsecutiveDryDays}(t_0 + 3, t_0 + 16) \ge 7$ consecutive days with $R(t) < 2.5\text{ mm}$.

**Agricultural Impact:** Farmers who sow upon seeing the initial rain suffer germination failure, seed scorching, and total loss of initial input investment.

---

## 4. Monsoon Break / Dry Spell Definition

A **Monsoon Break** is defined during the active monsoon window (June 25 to September 15) after local onset has established.

### 4.1 Daily Break State
A day $t$ is in a "Break State" if:
$$R(t) < 2.5\text{ mm}$$
and the running consecutive dry days $CDD(t) \ge 5\text{ days}$.

### 4.2 Multi-Horizon Break Target $Y_{\text{break}, H}(t)$
For a forecast issued on day $t$ with lead horizon $H \in \{7, 14, 21, 30\}$ days:
$$Y_{\text{break}, H}(t) = \begin{cases}
1, & \text{if } \exists [t_a, t_b] \subset [t + 1, t + H] \text{ such that } (t_b - t_a + 1) \ge 5 \text{ and } \forall \tau \in [t_a, t_b], R(\tau) < 2.5\text{ mm} \\
0, & \text{otherwise}
\end{cases}$$

---

## 5. Heavy Rainfall Target Label

Heavy rainfall is defined using IMD's standard 24-hour threshold of $\ge 64.5\text{ mm}$:

$$Y_{\text{heavy}, H}(t) = \begin{cases}
1, & \text{if } \max_{\tau \in [t+1, t+H]} R(\tau) \ge 64.5\text{ mm} \\
0, & \text{otherwise}
\end{cases}$$

For 7 and 14-day aggregated hazards, a secondary target of 3-day accumulated rainfall $\ge 100\text{ mm}$ is also monitored for waterlogging risk.
