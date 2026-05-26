import { NextResponse } from "next/server";
import crypto from "crypto";

function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

function normalizeCompany(company) {
  const map = {
    顺丰: "shunfeng",
    顺丰速运: "shunfeng",
    圆通: "yuantong",
    圆通速递: "yuantong",
    中通: "zhongtong",
    中通快递: "zhongtong",
    申通: "shentong",
    申通快递: "shentong",
    韵达: "yunda",
    韵达快递: "yunda",
    德邦: "debangwuliu",
    德邦快递: "debangwuliu",
    京东: "jd",
    京东物流: "jd",
    极兔: "jtexpress",
    极兔速递: "jtexpress",
    邮政: "ems",
    EMS: "ems",
    百世: "baishiwuliu",
    天天: "tiantian",
  };

  return map[company] || company?.trim()?.toLowerCase();
}

function parseTrackingResponse(raw) {
  const data = raw?.data || [];

  const events = Array.isArray(data)
    ? data.map((item) => ({
        time: item.time || "",
        status: item.context || "",
        location: item.area || "",
        description: item.context || "",
      }))
    : [];

  const firstTime = events[0]?.time || null;
  const lastTime = events[events.length - 1]?.time || null;
  const lastStatusText = events.length > 0 ? events[events.length - 1].status : "";

  const delivered =
    String(raw?.state) === "3" ||
    /签收|已送达|已妥投|派送完成/.test(lastStatusText || "");

  return {
    status: delivered ? "delivered" : "in_transit",
    statusText: delivered ? "已送达" : "运输中",
    events,
    shipDate: firstTime ? firstTime.slice(0, 10) : null,
    arrivalDate: delivered && lastTime ? lastTime.slice(0, 10) : null,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");
    const number = searchParams.get("number");

    if (!company || !number) {
      return NextResponse.json(
        { error: "缺少物流公司或物流单号" },
        { status: 400 }
      );
    }

    const customer = process.env.KUAIDI100_CUSTOMER;
    const key = process.env.KUAIDI100_KEY;

    if (!customer || !key) {
      return NextResponse.json(
        { error: "未配置 KUAIDI100_CUSTOMER 或 KUAIDI100_KEY" },
        { status: 500 }
      );
    }

    const com = normalizeCompany(company);

    const param = JSON.stringify({
      com,
      num: number,
    });

    // 快递100常用签名：md5(param + key + customer)
    const sign = md5(param + key + customer).toUpperCase();


    const body = new URLSearchParams();
    body.append("customer", customer);
    body.append("param", param);
    body.append("sign", sign);

    const response = await fetch("https://poll.kuaidi100.com/poll/query.do", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: body.toString(),
    });

    const raw = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: raw?.message || "快递100接口请求失败",
          raw,
        },
        { status: 500 }
      );
    }

    if (String(raw?.status) !== "200") {
      return NextResponse.json(
        {
          error: raw?.message || "快递100查询失败",
          raw,
        },
        { status: 500 }
      );
    }

    const normalized = parseTrackingResponse(raw);

    return NextResponse.json({
      company,
      number,
      ...normalized,
      raw,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error.message || "物流查询异常",
      },
      { status: 500 }
    );
  }
}
