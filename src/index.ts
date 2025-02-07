import { Context, Schema, h, Session } from 'koishi';
import { createDirMapByObject, createPathMapByDir } from './mapTool';
import { } from 'koishi-plugin-smmcat-localstorage';
import { } from 'koishi-plugin-word-core';

import * as fs from 'fs/promises';
import * as path from 'path';

export const name = 'smmcat-galmake';

export const usage = `
通过创建文件夹生成对应映射关系的多分支简单galgame游戏制作插件

 - result.text 中的内容代表最终的结局（会忽略同级并同级后续的文件夹）
 - title.text 中的内容代表该层级剧情的描述

只要上述文件放置在对应文件夹中，就会有对应的效果

通过 %标识符% 去实现 跳转分支、条件跳转、获得道具、失去道具、判断道具是否持有 等功能

- %jumpByLostProp% 标识符，通过交出持有物才可跳转分支 举例：参数示例：%jumpByLostProp|金币*4?1-1-1%
- %jumpByCheckProp%标识符，通过查询是否携带持有物才可跳转分支，参数示例：%jumpByCheckProp|金币*4?1-1-1%
- %getProp%标识符，获得道具 参数示例：%getProp|金币*4%
- %getMoreProp%b标识符，获得多个道具 参数示例 %getMoreProp|金币*10+食物*3%
- %lostProp%标识符，失去道具 参数示例：%getProp|金币*4%
- %jumpByNoneProp_NotBack% 判断用户是否不存在某物，若不存在则跳转分支 %jumpByNoneProp_NotBack|血量*1?1-2-3% 
- %jumpByNoneProp% 判断用户是否不存在某物，若不存在则跳转指定分支，否则返回上一步 %jumpByNoneProp|信件*1?1-1-1% 
- %getAchievements%标识符，获得成就 用户在该分支下将获得对应成就名的成就 参考示例：%getAchievements|冒险王%
    

从 0.1.0 版本后，需要使用 [smmcat-localstorage](/market?keyword=smmcat-localstorage) 服务来实现本地化存档操作，用于重启 Koishi 后仍然保留玩家数据
当启用[word-core](/market?keyword=word-core)与[word-core-grammar-basic](/market?keyword=word-core-grammar-basic)插件后，可以将回复接入词库解析
***
如果你对 galgame 感兴趣，或者想一起写剧本；[欢迎加群](https://qm.qq.com/q/i1OHiS7aD0)
`;

export interface Config
{
  mapAddress: string;
  overtime: number;
  debug: boolean;
  tipsProp: boolean;
  showFaQ: boolean;
  wordSave: string;
}

export const Config: Schema<Config> = Schema.object({
  mapAddress: Schema.string().default("./data/galmake").description("剧本结构放置位置"),
  overtime: Schema.number().default(3e4).description("对话访问的超时时间"),
  debug: Schema.boolean().default(false).description("日志查看更多信息"),
  tipsProp: Schema.boolean().default(true).description("当不满足要求将提示所需要的物品"),
  showFaQ: Schema.boolean().default(true).description("显示所有 获得/失去 道具提示"),
  wordSave: Schema.string().default("smm").description("词库保存的数据库")
});

export const inject = {
  required: ["localstorage"],
  optional: ["word"]
};

export function apply(ctx: Context, config: Config)
{
  const addTemplate = async (upath: string) =>
  {
    const obj = [
      {
        name: "1.剧本演示",
        child: [
          {
            name: "1.睡一觉",
            child: [
              {
                name: "1.返回 序章",
                child: [],
                title: "%jumpBranch|1%"
              },
              {
                name: "2.复活",
                child: [],
                title: "%jumpByLostProp|金币*11?1-2-3-2-1-1%"
              }
            ],
            title: "熟睡中饿死了，需要20金币复活，你选择..."
          },
          {
            name: "2.冒险去",
            child: [
              {
                name: "1.打特么的 不怂",
                child: [
                  {
                    name: "1.返回序章",
                    child: "%jumpBranch|1%"
                  }
                ],
                title: "她们把你骗的连裤衩都没了"
              },
              {
                name: "2.不敢打 委婉拒绝",
                child: [
                  {
                    name: "1.返回序章",
                    child: "%jumpBranch|1%"
                  }
                ],
                title: "她们把你打了一顿，抢劫跑人"
              },
              {
                name: "3.一看是怪物 通知卫兵",
                child: [
                  {
                    name: "1.蕉个朋友 给你了",
                    child: [
                      {
                        name: "1.我有 你康康",
                        child: [
                          {
                            name: "1.继续",
                            child: [
                              {
                                name: "1.返回序章",
                                child: "%jumpBranch|1%"
                              }
                            ],
                            title: "因为太饿，吃太多撑死了。结束人生..."
                          }
                        ],
                        title: "%jumpByCheckProp|金币?1-2-3-1-1-1%"
                      },
                      {
                        name: "2.没有 可以白给我吗",
                        child: [
                          {
                            name: "1.返回序章",
                            child: "%jumpBranch|1%"
                          }
                        ],
                        title: "你被打了一顿，然后饿死街头"
                      }
                    ],
                    title: "你游荡在街上，没钱什么也做不了。也没实际的身份证明...\r\n\r\n走了一会，你实在饿得不行。去了一家看起来 是餐厅的地方，老板要确认你是否有钱。你现在："
                  },
                  {
                    name: "2.请给我打钱 谢谢",
                    child: [
                      {
                        name: "1.去买房",
                        child: [
                          {
                            name: "1.继续",
                            child: [
                              {
                                name: "1.返回序章",
                                child: "%jumpBranch|1%"
                              }
                            ],
                            title: "你在 %getTime% 成为了有钱人，在城市中活得滋润。"
                          }
                        ],
                        title: "%jumpByLostProp|金币*11?1-2-3-2-1-1%"
                      },
                      {
                        name: "2.去找工作",
                        child: [
                          {
                            name: "1.返回序章",
                            child: "%jumpBranch|1%"
                          }
                        ],
                        title: "最后你成为了异世界的打工人"
                      }
                    ],
                    title: "%getProp|金币*10%\r\n拿到金币后，卫兵看你衣着特殊，以为你是外地人。推荐你去找份工作看看。你决定："
                  }
                ],
                title: "你发现这个阵容的冒险小队不对劲。马上告知了巡逻的卫兵。她们仓皇逃窜走了...\r\n...经过一番追赶虽然跑了一个，但是女哥布林 Shigma 被抓住了\r\n\r\n“你真走运，”卫兵说，“她们是悬赏的罪犯。一人奖金就有 10 金币呢！”\r\n“是吗？太好了” 你似乎有点期待..."
              }
            ],
            title: "你遇到了一个冒险小队。小队里的人物中一个是爆乳法师 42，一个是 女哥布林 Shigma。\r\n她们邀请你讨伐史莱姆。 你决定...\r\n（刚开始你还未了解这个世界，请谨慎选择...）"
          }
        ],
        title: '<img src="https://forum.koishi.xyz/user_avatar/forum.koishi.xyz/lizard/96/2522_2.png" />\r\n你在 %getTime% 时候被车撞 s 了嗯...\r\n这是一个异世界，你果然...又被撞到异世界里了。依然到了异世界，那就拿出真本事吧！'
      }
    ];
    try
    {
      createDirMapByObject(obj, upath);
    } catch (error)
    {
      console.log(error);
    }
  };

  const userBranch = {};
  const onlyOneTemp = {};
  const takeIng = {};
  const achievements = {};
  const transferTool = {
    // 获取当前时间
    getTime: () => (new Date()).toLocaleString().replaceAll("/", "-"),
    // 获取随机动漫图
    rollACGImg()
    {
      return h.image("https://www.dmoe.cc/random.php");
    },
    // 跳转分支
    jumpBranch(session: Session, params: string, ev)
    {
      userBranch[session.userId] = params?.split("-") || [];
      ev.change = true;
    },
    // 通过交出持有物跳转分支 xxx>4?1-1-1
    jumpByLostProp(session: Session, params: string, ev)
    {
      const dict = params.split("?");
      if (this.lostProp(session, dict[0], ev))
      {
        userBranch[session.userId] = dict[1]?.split("-") || [];
        ev.change = true;
      } else
      {
        userBranch[session.userId].pop();
        ev.change = true;
        const [prop, num] = dict[0].split("*");
        session.send("不满足要求，请重新选择。" + (config.tipsProp ? `
tip:需要提交${num || 1}个${prop}` : ""));
      }
    },
    // 通过查询是否存在持有物跳转分支 xxx>4?1-1-1
    jumpByCheckProp(session: Session, params: string, ev)
    {
      const dict = params.split("?");
      const [prop, num] = dict[0].split("*");
      if (this.querymentProp(session, prop, num || 1))
      {
        userBranch[session.userId] = dict[1]?.split("-") || [];
        ev.change = true;
      } else
      {
        userBranch[session.userId].pop();
        ev.change = true;
        session.send("不满足要求，请重新选择。" + (config.tipsProp ? `
tip:需要持有${num || 1}个${prop}` : ""));
      }
    },
    // 通过查询是否不存在持有物跳转分支 xxx*4?1-1-1
    jumpByNoneProp(session: Session, params: string, ev)
    {
      const dict = params.split("?");
      const [prop, num] = dict[0].split("*");
      if (!this.querymentProp(session, prop, num || 1))
      {
        userBranch[session.userId] = dict[1]?.split("-") || [];
        ev.change = true;
      } else
      {
        userBranch[session.userId].pop();
        ev.change = true;
        session.send("不满足要求，请重新选择。" + (config.tipsProp ? `
tip:需要不持有超过${num || 1}个${prop}` : ""));
      }
    },
    // 通过查询是否不存在持有物则跳转分支，否则继续前进 xxx*4?1-1-1
    jumpByNoneProp_NotBack(session: Session, params: string, ev)
    {
      const dict = params.split("?");
      const [prop, num] = dict[0].split("*");
      if (!this.querymentProp(session, prop, num || 1))
      {
        userBranch[session.userId] = dict[1]?.split("-") || [];
        ev.change = true;
      }
    },
    // 获得道具 |xxx*4
    getProp(session: Session, params: string, ev)
    {
      const item = params.split("*");
      const prop = item[0];
      const num = isNaN(Number(item[1])) ? 1 : Number(item[1]);
      if (!onlyOneTemp[session.userId])
      {
        onlyOneTemp[session.userId] = [];
      }
      if (!onlyOneTemp[session.userId]?.includes(userBranch[session.userId].join("-")))
      {
        if (!takeIng[session.userId])
        {
          takeIng[session.userId] = {};
        }
        onlyOneTemp[session.userId].push(userBranch[session.userId].join("-"));
        if (takeIng[session.userId][prop] === void 0)
        {
          takeIng[session.userId][prop] = num;
        } else
        {
          takeIng[session.userId][prop] += num;
        }
        config.showFaQ && session.send("你在事件中得到了" + (num || 1) + `个${prop}`);
      }
    },
    // 获得多个道具 |xxx*2+xxx*4
    getMoreProp(session: Session, params: string, ev)
    {
      const moreItem = params.split("+");
      const msgList = [];
      moreItem.map((params) =>
      {
        const item = params.split("*");
        const prop = item[0];
        const num = isNaN(Number(item[1])) ? 1 : Number(item[1]);
        if (!onlyOneTemp[session.userId])
        {
          onlyOneTemp[session.userId] = [];
        }
        if (!onlyOneTemp[session.userId]?.includes(userBranch[session.userId].join("-")))
        {
          if (!takeIng[session.userId])
          {
            takeIng[session.userId] = {};
          }
          if (takeIng[session.userId][prop] === void 0)
          {
            takeIng[session.userId][prop] = num;
          } else
          {
            takeIng[session.userId][prop] += num;
          }
          msgList.push("你在事件中得到了" + (num || 1) + `个${prop}`);
        }
      });
      config.showFaQ && session.send(msgList.join('\n'));
      onlyOneTemp[session.userId].push(userBranch[session.userId].join("-"));
    },
    // 失去某物 |xxx>1
    lostProp(session: Session, params: string, ev)
    {
      const item = params.split("*");
      const prop = item[0];
      const num = isNaN(Number(item[1])) ? 1 : Number(item[1]);
      if (!onlyOneTemp[session.userId]?.includes(userBranch[session.userId].join("-")))
      {
        if (!this.querymentProp(session, prop, num || 1))
          return false;
        takeIng[session.userId][prop] -= num;
        if (!takeIng[session.userId][prop])
        {
          delete takeIng[session.userId][prop];
        }
        onlyOneTemp[session.userId].push(userBranch[session.userId].join("-"));
        config.showFaQ && session.send("你在事件中失去了" + (num || 1) + `个${prop}`);
        return true;
      }
    },
    // 判断是否存在某物
    querymentProp(session: Session, prop: string | number, num = 1)
    {
      if (!takeIng[session.userId])
      {
        takeIng[session.userId] = {};
      }
      if (takeIng[session.userId][prop] === void 0)
      {
        return false;
      }
      if (takeIng[session.userId][prop] < Number(num))
      {
        return false;
      }
      return true;
    },
    // 获得成就 |初学者
    getAchievements(session: Session, prop: string | number)
    {
      if (!achievements[session.userId])
      {
        achievements[session.userId] = {};
      }
      if (!achievements[session.userId][prop])
      {
        achievements[session.userId][prop] = this.getTime();
        localStoreData.setLocalStoreData(session.userId);
        session.send(`恭喜你获得成就！【${prop}】
可在 /剧本成就 指令中查看`);
      }
    }
  };

  const galplayMap = {
    // 基地址
    upath: path.join(ctx.baseDir, config.mapAddress),
    mapInfo: [],
    // 初始化路径
    async initPath()
    {
      try
      {
        await fs.access(this.upath);
      } catch (error)
      {
        try
        {
          await fs.mkdir(this.upath, { recursive: true });
          await addTemplate(this.upath);
        } catch (error2)
        {
          console.error(error2);
        }
      }
    },
    // 初始化菜单结构
    async init()
    {
      await this.initPath();
      this.mapInfo = createPathMapByDir(this.upath);
      config.debug && console.log(JSON.stringify(this.mapInfo, null, " "));
      config.debug && console.log("[smmcat-galmake]:剧本姬构建完成");
    },
    // 词库的san check
    async wordSanCheck(message: string, session: Session)
    {
      if (ctx.word)
      {
        const msg = await ctx.word.driver.parMsg(message.concat(), { saveDB: config.wordSave }, session);
        if (msg)
        {
          return msg;
        } else
        {
          return message;
        }
      } else {
        return message;
      }
    },
    async getMenu(goal: string, callback?: (event) => Promise<void>)
    {
      let selectMenu = this.mapInfo;
      let end = false;
      let indePath = [];
      let PathName = [];
      let change = false;
      if (!goal)
      {
        await callback && await callback({ selectMenu, lastPath: "", change, crumbs: "", end });
        return;
      }
      let title = null;
      const indexList = goal.split("-").map((item) => Number(item));
      for (const item of indexList)
      {
        indePath.push(item);
        PathName.push(selectMenu[item - 1]?.name.length > 6 ? selectMenu[item - 1]?.name.slice(0, 6) + "..." : selectMenu[item - 1]?.name);
        title = selectMenu[item - 1]?.title || null;
        if (selectMenu.length < item)
        {
          selectMenu = void 0;
          indePath.pop();
          PathName.pop();
          await callback && await callback({ selectMenu, lastPath: indePath.join("-"), change, crumbs: PathName.slice(-3).reverse().join("<"), end });
          break;
        }
        if (selectMenu && typeof selectMenu === "object")
        {
          selectMenu = selectMenu[item - 1].child;
          if (typeof selectMenu === "string")
          {
            end = true;
            await callback && await callback({ selectMenu, lastPath: indePath.join("-"), change, crumbs: PathName.slice(-3).reverse().join("<"), end });
            break;
          }
        }
      }
      end || await callback && await callback({ selectMenu, title, lastPath: indePath.join("-"), change, crumbs: PathName.slice(-3).reverse().join("<"), end });
    },
    // 菜单渲染到界面
    async markScreen(pathLine: string, session: Session)
    {
      let goalItem = { change: false };
      // 查找对应菜单 获取回调
      await this.getMenu(pathLine, async (ev: any) =>
      {
        // 分析转义符 %type%
        if (ev.end)
        {
          ev.selectMenu = await this.wordSanCheck(ev.selectMenu, session);
          ev.selectMenu = ev.selectMenu.replace(/%([^%]*)%/g, (match, capture) =>
          {
            let result = '';
            const temp = capture.split('|');
            if (transferTool[temp[0]])
            {
              result = transferTool[temp[0]](session, temp[1], ev) || '';
            }
            return result;
          });
        }
        if (ev.title)
        {
          ev.title = await this.wordSanCheck(ev.title, session);
          ev.title = ev.title.replace(/%([^%]*)%/g, (match, capture) =>
          {
            let result = '';
            const temp = capture.split('|');
            if (transferTool[temp[0]])
            {
              result = transferTool[temp[0]](session, temp[1], ev) || '';
            }
            return result;
          });
        }
        goalItem = ev;
      });
      return await this.format(goalItem, session);
    },
    // 格式化界面输出
    async format(goalItem, session: Session)
    {
      if (goalItem.change)
        return await this.markScreen(userBranch[session.userId].join("-"), session);
      if (!goalItem.selectMenu)
      {
        return {
          msg: "",
          err: true
        };
      }
      if (goalItem.name?.includes("__discard"))
      {
        return {
          msg: "",
          err: true
        };
      }
      if (goalItem.end)
      {
        return {
          msg: (h.select(goalItem.selectMenu || "", "img").length > 0 ? "" : "【内容】\n") + (goalItem.selectMenu ? `${goalItem.selectMenu.replace(/\\/g, "")}
` : "") + `

0 退出
----------------------------
` + (goalItem.crumbs ? `[当前位置]${goalItem.crumbs}
` : "序章\n"),
          err: false,
          end: goalItem.end
        };
      } else
      {
        return {
          msg: (h.select(goalItem.title || "", "img").length > 0 ? "" : "【内容】\n") + (goalItem.title ? `${goalItem.title.replace(/\\/g, "")}

` : "") + `${goalItem.selectMenu.map((item) => item.name.includes("__discard") ? null : item.name).filter((item) => item !== null).join("\n") + "\n\n0 退出"}
----------------------------
` + (goalItem.crumbs ? `[当前位置]
${goalItem.crumbs}
` : "序章\n"),
          err: false,
          end: goalItem.end
        };
      }
    }
  };

  const localStoreData = {
    upath: "",
    ready: false,
    async init()
    {
      this.upath = path.join(ctx.localstorage.basePath, "./smm-galmark");
      try
      {
        await fs.access(this.upath);
      } catch (error)
      {
        try
        {
          await fs.mkdir(this.upath, { recursive: true });
        } catch (error2)
        {
          console.error(error2);
        }
      }
      const dirList = await fs.readdir(this.upath);
      const dict = { ok: 0, err: 0 };
      const eventList = dirList.map((item) =>
      {
        return new Promise(async (resolve, rejects) =>
        {
          try
          {
            const res = JSON.parse(await ctx.localstorage.getItem(`smm-galmark/${item}`) || "{}");
            userBranch[item] = res.userBranch;
            onlyOneTemp[item] = res.onlyOneTemp;
            takeIng[item] = res.takeIng;
            achievements[item] = res.achievements;
            dict.ok++;
            resolve(true);
          } catch (error)
          {
            dict.err++;
            resolve(true);
          }
        });
      });
      await Promise.all(eventList);
      this.ready = true;
      config.debug && console.log(`[smmcat-galmark]:读取用户本地数据完成，成功${dict.ok}个，失败${dict.err}个`);
    },
    // 记录存档
    async setLocalStoreData(userId)
    {
      if (!this.ready || !userId)
        return;
      const temp = {
        userBranch: userBranch[userId] || [],
        onlyOneTemp: onlyOneTemp[userId] || [],
        takeIng: takeIng[userId] || {},
        achievements: achievements[userId] || {}
      };
      config.debug && console.log(userId + "用户存储到本地记录");
      await ctx.localstorage.setItem(`smm-galmark/${userId}`, JSON.stringify(temp));
    },
    // 清除记录
    async clearLocalStoreData(userId)
    {
      if (!this.ready || !userId)
        return;
      const temp = {
        userBranch: [],
        onlyOneTemp: [],
        takeIng: {}
      };
      config.debug && console.log(userId + "用户清空本地记录");
      await ctx.localstorage.setItem(`smm-galmark/${userId}`, JSON.stringify(temp));
    }
  };

  ctx.on("ready", () =>
  {
    galplayMap.init();
    localStoreData.init();
  });

  ctx.command("剧本姬");

  ctx.command("剧本姬/开始剧情").action(async ({ session }) =>
  {
    if (!userBranch[session.userId])
    {
      userBranch[session.userId] = [];
      onlyOneTemp[session.userId] = [];
      takeIng[session.userId] = {};
    }
    while (true)
    {
      config.debug && console.log("当前持有：" + takeIng[session.userId]);
      config.debug && console.log("已获取/失去过道具的分支：" + onlyOneTemp[session.userId]);
      let data = await galplayMap.markScreen(userBranch[session.userId].join("-"), session);
      if (data.err)
      {
        userBranch[session.userId].pop();
        let data2 = await galplayMap.markScreen(userBranch[session.userId].join("-"), session);
        await session.send("操作不对，请重新输入：\n注意需要输入指定范围的下标");
        await session.send(data2.msg);
      }

      await session.send(data.msg);

      const res = await session.prompt(config.overtime);
      if (res === void 0)
      {
        await localStoreData.setLocalStoreData(session.userId);
        await session.send("长时间未操作，退出剧本，记录保留");
        break;
      }
      if (!res.trim() || isNaN(Number(res)) && res.toLowerCase() !== "q" && res.toLowerCase() !== "p")
      {
        await session.send("请输入指定序号下标");
        continue;
      }
      if (res == "0")
      {
        await localStoreData.setLocalStoreData(session.userId);
        await session.send("已退出剧本，记录保留");
        break;
      }
      userBranch[session.userId].push(res);
      if (data.end)
      {
        await session.send("已经到底了!");
        userBranch[session.userId].pop();
      }
    }
  });

  ctx.command("剧本姬/重置进度").action(async ({ session }) =>
  {
    if (!userBranch[session.userId]?.length)
    {
      await session.send("你的当前进度不需要重置");
    }
    await session.send("是否要重置当前进度？\n 20秒回复：是/否");
    const res = await session.prompt(2e4);
    if (res === "是")
    {
      userBranch[session.userId] = [];
      onlyOneTemp[session.userId] = [];
      takeIng[session.userId] = {};
      await localStoreData.clearLocalStoreData(session.userId);
      await session.send("已重置当前进度");
    }
  });

  ctx.command("剧本姬/当前持有").action(async ({ session }) =>
  {
    const temp = takeIng[session.userId];
    if (!temp || !Object.keys(temp).length)
    {
      await session.send("你当进度中前还没有任何道具持有...");
      return;
    }
    const msg = Object.keys(temp).map((item) =>
    {
      return `【${item}】单位：${temp[item]}`;
    }).join("\n");
    await session.send("你当前进度中持有:\n\n" + msg);
  });


  ctx.command("剧本姬/剧本成就").action(async ({ session }) =>
  {
    const temp = achievements[session.userId];
    if (!temp || !Object.keys(temp).length)
    {
      await session.send("你当还没有得到任何成就...");
      return;
    }
    const msg = Object.keys(temp).map((item) =>
    {
      return `【${item}】：${temp[item]}`;
    }).join("\n");
    await session.send("你当前获得的成就和对应获取时间如下:\n\n" + msg);
  });
}
