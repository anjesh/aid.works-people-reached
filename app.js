var OrganisationClaim = Backbone.Model.extend({
    defaults: {
        name: "",
        claim: "",
        remarks: ""
    }
});
var OrganisationClaimCollection = Backbone.Collection.extend({
    model: OrganisationClaim,
    fetch: function() {
        var self = this;
        $.ajax({
            url: "data.json",
            success: function(result) {
                _.each(result, function(r) {
                    self.add({
                        name: r.Organisation,
                        claim: parseInt(r.Claim),
                        remarks: r.Remarks
                    });
                });
                self.trigger("collectionReady");
            }
        })
    }
});
var ChartView = Backbone.View.extend({
    events: {
        "click #sort-by-claim": "sortByClaim",
        "click #sort-by-name": "sortByName",
        "keyup #search-text": "searchText"
    },
    options: {
        margin: {
            top: 10,
            right: 300,
            bottom: 20,
            left: 30
        },
        height: 700,
        width: 550,
        barheight: 20
    },
    initialize: function(options) {
        this.getOrder = (function() {
            var order = true;
            return function() {
                order = !order;
                return order;
            }
        })();

        this.options = _.defaults(options, this.options);
        this.listenTo(this.collection, "collectionReady", this.render);
        _.bindAll(this, "getXScale", "getYScale", "render");
        var margin = this.options.margin;
        this.width = this.options.width - margin.left - margin.right;
        this.height = this.options.height - margin.top - margin.bottom;
        this.svg = d3.select(this.el).append("svg").attr("width", this.width + margin.left + margin.right).attr("height", this.height + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        this.tip = d3.tip().attr("class", "d3-tip").direction("n").offset([5, 0]).html(function(d) {
            return "<strong>Organisation:</strong>" + d.get("name") + "" + "<br><b>Claim</b>: " + d.get("claim") + "<br>" + d.get("remarks");
        });
    },
    getXScale: function() {
        return d3.scale.linear().range([0, this.width]).domain([0, d3.max(this.collection.pluck(this.options.yAttr))]);
    },
    getYScale: function() {
        return d3.scale.ordinal().range([this.height, 0]).domain(this.collection.map(function(d) {
            return d.get("name");
        }));
    },
    render: function() {
        models = this.collection.models;
        var x = this.getXScale();
        var y = this.getYScale();
        var self = this;
        var barheight = this.options.barheight;
        this.bargroup = this.svg.append("g").attr("transform", "translate(200,0)");
        this.bargroup.call(this.tip);        
        this.bargroup.selectAll("rect").data(models).enter().append("rect").attr("x", 0).attr("y", function(d, i) {
            return i * barheight;
        }).attr("width", function(d) {
            return x(d.get("claim"));
        }).attr("height", barheight - 1).on("mouseover", self.tip.show).on("mouseout", self.tip.hide);
        this.infoTextGroup = this.svg.append("g").attr("transform", "translate(210,12)");
        this.infoTextGroup.selectAll("text").data(this.collection.models).enter().append("text").attr("x", function(d) {
            return x(d.get("claim"));
        }).attr("y", function(d, i) {
            return i * barheight;
        }).attr("class", "claiminfo").text(function(d, i) {
            if (d.get("claim") == 0) return "No Claim";
            else return d.get("claim");
        }).on("mouseover", self.tip.show).on("mouseout", self.tip.hide);
        this.labelGroup = this.svg.append("g").attr("transform", "translate(0,12)");
        this.labelGroup.selectAll("text").data(this.collection.models).enter().append("text").attr("x", 0).attr("y", function(d, i) {
            return i * barheight;
        }).attr("class", "label").text(function(d, i) {
            return d.get("name");
        }).on("mouseover", self.tip.show).on("mouseout", self.tip.hide);
    },
    sortByClaim: function() {
        var sortOrder = this.getOrder()
        this.sort(function(a, b) {
            if (sortOrder) return a.get("claim") - b.get("claim");
            else return b.get("claim") - a.get("claim");
        });
    },
    sortByName: function() {
        var sortOrder = this.getOrder()
        this.sort(function(a, b) {
            if (sortOrder) return d3.ascending(a.get("name"), b.get("name"));
            else return d3.descending(a.get("name"), b.get("name"));
        });
    },
    sort: function(sortItemsFx) {
        var barheight = this.options.barheight;
        var x = this.getXScale();
        var y = this.getYScale();
        this.svg.selectAll("rect").sort(sortItemsFx).transition().delay(function(d, i) {
            return i * 10;
        }).duration(500).attr("y", function(d, i) {
            return i * barheight;
        });
        this.svg.selectAll("text.label").sort(sortItemsFx).transition().delay(function(d, i) {
            return i * 10;
        }).duration(500).attr("y", function(d, i) {
            return i * barheight;
        });
        this.svg.selectAll("text.claiminfo").sort(sortItemsFx).transition().delay(function(d, i) {
            return i * 10;
        }).duration(500).attr("y", function(d, i) {
            return i * barheight;
        });
    },
    searchText: function() {
        var val = this.$el.find("#search-text").val();
        if (val.length >= 2) {
            this.filter(val.toLowerCase());
        }
    },
    filter: function(q) {
        var q = q || "";
        var models = this.collection.filter(function(model) {
            return _.any(model.values(), function(v) {
                if (v) {
                    v = String(v).toLowerCase();
                    return~ v.indexOf(q);
                }
            });
        });
        var self = this;
        var x = this.getXScale();
        var y = this.getYScale();
        var barheight = this.options.barheight;
        this.bargroup.selectAll("rect").remove();
        this.bargroup.selectAll("rect").data(models).enter().append("rect").attr("x", 0).attr("y", function(d, i) {
            return i * barheight;
        }).attr("width", function(d) {
            return x(d.get("claim"));
        }).attr("height", barheight - 1).on("mouseover", self.tip.show).on("mouseout", self.tip.hide);
        this.infoTextGroup.selectAll("text").remove();
        this.infoTextGroup.selectAll("text").data(models).enter().append("text").attr("x", function(d) {
            return x(d.get("claim"));
        }).attr("y", function(d, i) {
            return i * barheight;
        }).attr("class", "claiminfo").text(function(d, i) {
            if (d.get("claim") == 0) return "No Claim";
            else return d.get("claim");
        }).on("mouseover", self.tip.show).on("mouseout", self.tip.hide);
        this.labelGroup.selectAll("text").remove();
        this.labelGroup.selectAll("text").data(models).enter().append("text").attr("x", 0).attr("y", function(d, i) {
            return i * barheight;
        }).attr("class", "label").text(function(d, i) {
            return d.get("name");
        }).on("mouseover", self.tip.show).on("mouseout", self.tip.hide);
    }
});